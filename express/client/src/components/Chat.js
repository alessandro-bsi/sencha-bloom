import React, {useEffect, useState} from 'react';
import {setupWeb3, web3, chatContract, _} from '../web3Config';
import {useHistory, useParams} from 'react-router-dom';
import crypto from 'crypto';
import {uploadToIPFS, retrieveFromIPFS} from '../ipfsClient';


function Chat() {
    const { roomId } = useParams();  // Get room ID from URL params
    const [userAddress, setUserAddress] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [joinRequests, setJoinRequests] = useState([]);
    const history = useHistory();

    const EC = require("elliptic").ec;
    const ec = new EC('secp256k1');

    useEffect(() => {
        const loadData = async () => {
            await setupWeb3();
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];

            console.log(`User Address> ${userAddress}`);

            // Check if user is a member of the chat room
            const isMember = await chatContract.methods.isMemberOf(roomId).call({from: userAddress});

            console.log(`Is Member: ${isMember}`)

            if (!isMember) {
                alert('You are not a member of this chat room!');
                history.push('/rooms');
            }

            // Load and decrypt messages
            await loadAndDecryptMessages(roomId, userAddress).catch(function (e) {
                console.log(e);
            });

            // Load join requests
            const requests = await chatContract.methods.getJoinRequests(roomId).call({from: userAddress});
            setJoinRequests(requests);
        };
        loadData();
    }, [roomId, history]);

    const fetchOrUpdateSecret = async (roomId, user) => {
        // Now this step should, in a real environment, start the steps for the Multi-Party Diffie-Hellman
        // Key exchange. This should ideally be implemented in a decentralised way, with the clients calculating
        // the secrets and a server acting purely as a distribution node

        // As stated in the README this part is a MOCK server, which replies with a shared secret
        // (either static or random)

        // Step 1: GET nonce from the server
        const nonceResponse = await fetch(`${process.env.REACT_APP_SSH_API_URL}/api/secret/${roomId}`);
        const { nonce } = await nonceResponse.json();

        // Step 2: Sign the nonce with the user's private key
        const signedNonce = await web3.eth.sign(nonce, user);

        // Step 3: POST signed nonce to obtain the shared secret
        const secretResponse = await fetch(`${process.env.REACT_APP_SSH_API_URL}/api/secret/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: user, signedNonce }),
        });

        if (secretResponse.ok) {
            const { sharedSecret } = await secretResponse.json();
            return sharedSecret;
        } else {
            console.error('Failed to retrieve shared secret');
        }
    };

    // Load and decrypt messages using the shared secret stack
    const loadAndDecryptMessages = async (roomId, user) => {
        const messageHashes = await chatContract.methods.getMessages(roomId).call({from: user});
        let isPrivate = await chatContract.methods.isRoomPrivate(roomId).call({from: user});

        const decryptedMessages = [];

        // Retrieve the room state (shared secret stack and public keys) from localStorage
        const roomState = getRoomState(roomId);
        let { secrets, publicKeys } = roomState;

        // For each message, try to decrypt it using the stack of shared secrets
        for (const hash of messageHashes) {
            let decryptedMessage = null;

            if(isPrivate){
                let secretStack = [...secrets];  // Copy of the current stack

                // Try to decrypt with the latest shared secret first (top of stack)
                while (secretStack.length > 0) {
                    const currentSharedSecret = secretStack[secretStack.length - 1];
                    try {
                        const encryptedMessage = await retrieveFromIPFS(hash);
                        decryptedMessage = decryptMessage(currentSharedSecret, encryptedMessage);

                        if (decryptedMessage) {
                            decryptedMessages.push(decryptedMessage);
                            break;  // Stop once we successfully decrypt the message
                        }
                    } catch (error) {
                        // Failed decryption, pop the stack and try the previous secret
                        secretStack.pop();
                    }
                }

                // If stack is empty, recalculate the shared secret and use it
                if (!decryptedMessage && secretStack.length === 0) {
                    const newSharedSecret = await fetchOrUpdateSecret(roomId, user);
                    secrets.push(newSharedSecret);  // Push new secret to the stack
                    updateRoomState(roomId, { secrets, publicKeys });

                    const encryptedMessage = await retrieveFromIPFS(hash);
                    decryptedMessage = decryptMessage(newSharedSecret, encryptedMessage);
                    decryptedMessages.push(decryptedMessage);
                }
            } else {
                let message = await retrieveFromIPFS(hash);
                decryptedMessages.push(message);
            }
        }

        setMessages(decryptedMessages);  // Set decrypted messages in state
    };

    // Send a new message
    const sendMessage = async (roomId, user) => {
        console.log(roomId);

        if (!newMessage.trim()) {
            alert('Message cannot be empty!');
            return;
        }

        try {

            let isPrivate = await chatContract.methods.isRoomPrivate(roomId).call({from: user});
            let encryptedMessage;

            if (isPrivate) {
                // Get room state (public keys and secrets)
                let roomState = getRoomState(roomId);
                let {publicKeys, secrets} = roomState;

                // Fetch current public keys from the blockchain to check for changes
                const currentPublicKeys = await chatContract.methods.getRoomMemberPublicKeys(roomId).call({from: user});

                // Compare public keys to check if any users have joined/left
                if (!arePublicKeysEqual(publicKeys, currentPublicKeys)) {
                    alert('The member list has changed, recalculating shared secret...');
                    const newSharedSecret = await fetchOrUpdateSecret(roomId, user);

                    // Update public keys and shared secrets
                    publicKeys = currentPublicKeys;
                    secrets.push(newSharedSecret);
                    updateRoomState(roomId, {secrets, publicKeys});
                }

                // Use the most recent shared secret from the stack for encryption
                const currentSharedSecret = secrets[secrets.length - 1];
                encryptedMessage = encryptMessage(currentSharedSecret, newMessage);
            } else {
                encryptedMessage = newMessage;
            }
            // Upload the encrypted message to IPFS
            const messageHash = await uploadToIPFS(encryptedMessage);
            await chatContract.methods.sendMessage(roomId, messageHash).send({ from: user });

            setNewMessage('');  // Clear input
            await loadAndDecryptMessages(roomId);  // Refresh messages
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Compare two arrays of public keys to see if they are the same
    const arePublicKeysEqual = (keys1, keys2) => {
        if (keys1.length !== keys2.length) return false;
        return keys1.every((key, index) => key === keys2[index]);
    };

    // Get the room state (shared secret stack and public keys) from localStorage
    const getRoomState = (roomId) => {
        const roomState = localStorage.getItem(`room-${roomId}-state`);
        if (roomState) {
            return JSON.parse(roomState);
        }
        // Initialize with empty secrets and public keys if not found
        return { secrets: [], publicKeys: [] };
    };

    // Update the room state in localStorage
    const updateRoomState = (roomId, state) => {
        localStorage.setItem(`room-${roomId}-state`, JSON.stringify(state));
    };

    // Encrypt message using AES-GCM with the shared secret
    const encryptMessage = (sharedSecret, message) => {
        const symmetricKey = crypto.createHash('sha256').update(sharedSecret).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);

        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return { iv: iv.toString('hex'), encryptedData: encrypted, authTag };
    };

    // Decrypt message using AES-GCM with the shared secret
    const decryptMessage = (sharedSecret, encryptedMessage) => {
        const symmetricKey = crypto.createHash('sha256').update(sharedSecret).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, Buffer.from(encryptedMessage.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));

        let decrypted = decipher.update(encryptedMessage.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    };

    // Redirect to the join request page
    const goToJoinRequestPage = () => {
        history.push(`/join-requests/${roomId}`);
    };

    return (
        <div className="container mt-5">
            <h1>Chat Room - {roomId}</h1>

            {/* Notification Panel for Join Requests */}
            {joinRequests.length > 0 && (
                <div className="alert alert-info">
                    <strong>Pending Join Requests:</strong>
                    {joinRequests.map((req, idx) => (
                        <div key={idx}>
                            <span>{req}</span>
                            <button className="btn btn-link" onClick={goToJoinRequestPage}>View Requests</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Messages Panel */}
            <div className="messages" style={{ height: '300px', overflowY: 'scroll', marginBottom: '20px' }}>
                {messages.map((msg, idx) => (
                    <div key={idx}>{msg.sender}: {msg}</div>
                ))}
            </div>

            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write your message"
                />
                <button className="btn btn-primary" onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default Chat;
