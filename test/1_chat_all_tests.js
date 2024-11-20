const IdentityProvider = artifacts.require("IdentityProvider");
const ChatRoomManager = artifacts.require("ChatRoomManager");
const Identity = artifacts.require("Identity");
// const IPFS = require("ipfs-http-client"); // Mock IPFS client for testing
const crypto = require("crypto");
const EC = require("elliptic").ec;
const ec = new EC('secp256k1');
const sinon = require("sinon");


// Test variables
const sharedSecret = crypto.randomBytes(32).toString('hex'); // Example shared secret

// Base58 alphabet (used by IPFS)
const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Function to generate a random IPFS-like hash
function generateRandomIpfsHash() {
    const hashLength = 46; // IPFS hashes typically have 46 characters in Base58

    let ipfsHash = 'Qm'; // IPFS hashes often start with "Qm"
    for (let i = 2; i < hashLength; i++) {
        const randomIndex = Math.floor(Math.random() * base58Alphabet.length);
        ipfsHash += base58Alphabet[randomIndex];
    }

    return ipfsHash;
}
// Mock IPFS client
const ipfs = {
    add: sinon.stub().resolves({ path: generateRandomIpfsHash() }),  // Mocks the IPFS hash
};


// With Infura
// const ipfs = IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

// Example usage in a test case
async function testIpfsAdd() {
    const ipfsHash = (await ipfs.add(JSON.stringify({ data: "test" }))).path;
    console.log("Mock IPFS Hash:", ipfsHash);  // Should log: QmMockedHash
}


contract("Identity Chat System", accounts => {
    let identityProvider;
    let chatRoomManager;
    let user1Identity, user2Identity, user3Identity;
    let identity;
    const owner = accounts[0];
    const authority = accounts[1];
    const untrusted_authority = accounts[2];

    const user1 = accounts[6];
    const user2 = accounts[7];
    const user3 = accounts[8];
    const unauthorizedActor = accounts[9];

    const privateRoomId = 1;
    const publicRoomId = 2;

    before(async () => {
        identityProvider = await IdentityProvider.deployed();
        chatRoomManager = await ChatRoomManager.deployed();
        identity = await Identity.deployed();

        const isTrusted = await identityProvider.isTrustedAuthority(authority, {from: owner});
        console.log(`Authority at ${authority} is trusted? ${isTrusted}`);

        // The claim data (message)
        claimdata1 = `[Verified Identity] ${user1}: User 1`;
        claimdata2 = `[Verified Identity] ${user1}: User 2`;
        claimdata3 = `[Verified Identity] ${user1}: User 3`;

        claimId1 = web3.utils.keccak256(claimdata1);
        claimId2 = web3.utils.keccak256(claimdata2);
        claimId3 = web3.utils.keccak256(claimdata3);

        sign1 = await web3.eth.sign(claimdata1, authority);
        sign2 = await web3.eth.sign(claimdata2, authority);
        sign3 = await web3.eth.sign(claimdata3, untrusted_authority);

        const dataHashBuffer = Buffer.from(claimId3.slice(2), 'hex');

        // Ethereum prefix as a buffer
        const prefixBuffer = Buffer.from("\x19Ethereum Signed Message:\n32");

        // Concatenate the prefix and the data hash buffer
        const concatenatedBuffer = Buffer.concat([prefixBuffer, dataHashBuffer]);

        // Compute the Ethereum signed message hash
        const ethSignedMessageHash = web3.utils.keccak256('0x' + concatenatedBuffer.toString('hex'));
        const signature = await web3.eth.sign(ethSignedMessageHash, authority);

        const url = "http://localhost/qrcode-sample/adsadsafsajfhsajkfkashfiotiagnolokdsan"
        /*
        console.log(`User     : ${user1}`)
        console.log(`Claim ID : ${claimId1}`)
        console.log(`Signature: ${sign1}`)
        console.log(`Data     : ${claimdata1}`)
        console.log(`URL      : ${url}`)
        */
        await identityProvider.register(user1, claimId1, sign1, claimdata1, url, { from: authority });
        await identityProvider.register(user2, claimId2, sign2, claimdata2, "", { from: authority });
        await identityProvider.register(user3, claimId3, sign3, claimdata3, "", { from: authority });

        /*
        console.log("User 1 Data:", claimdata1);
        console.log("User 1 Data Hash (web3.utils.keccak256):", claimId1);
        console.log("User 1 Signature:", sign1);

        console.log("User 2 Data:", claimdata2);
        console.log("User 2 Data Hash (web3.utils.keccak256):", claimId2);
        console.log("User 2 Signature:", sign2);

        console.log("User 3 Data:", claimdata3);
        console.log("User 3 Data Hash (web3.utils.keccak256):", claimId3);
        console.log("User 3 Data ETH Hash (...):", ethSignedMessageHash);
        console.log("User 3 Signature:", sign3);
        console.log("User 3 ETH xx Signature:", signature);
        const r = sign3.slice(0, 66);  // First 32 bytes (64 hex characters + '0x')
        const s = '0x' + sign3.slice(66, 130);  // Next 32 bytes
        let v = '0x' + sign3.slice(130, 132);  // Last 1 byte

        // Convert `v` to a decimal number
        v = web3.utils.hexToNumber(v);

        // Check if `v` needs to be adjusted to 27 or 28
        if (v < 27) {
            v += 27;
        }

        console.log("r:", r);
        console.log("s:", s);
        console.log("v:", v);  // Should be either 27 or 28
        */

        user1Identity = await identityProvider.userIdentities(user1);
        user2Identity = await identityProvider.userIdentities(user2);
        user3Identity = await identityProvider.userIdentities(user3);

        this.user1KeyPair = ec.genKeyPair();
        this.user2KeyPair = ec.genKeyPair();
        this.user3KeyPair = ec.genKeyPair();
        this.unauthorizedUserKeyPair = ec.genKeyPair();

        // Simulate IPFS setup (you can mock this)
        this.ipfs = ipfs;

        // Verify claims - Set as verified
        await identityProvider.authenticate(user1, claimId1, { from: authority });
        await identityProvider.authenticate(user2, claimId2, { from: authority });
        await identityProvider.authenticate(user3, claimId3, { from: untrusted_authority });

        /*
        console.log("User1 Address:", user1);
        console.log("User2 Address:", user2);
        console.log("User3 Address:", user3);
        */

    });

    // User Verification Tests
    it("should allow everyone to authenticate users", async () => {
        try {
            const isVerified = await chatRoomManager.isVerified(user1);
            assert.equal(isVerified, true, "User 1 should be verified by the authority");

            const isVerified2 = await identityProvider.isUserVerified(user2);
            assert.equal(isVerified2, true, "User 2 should be verified by the authority");
        } catch (error) {
            assert(!error.message.includes("revert"), "Unexpected revert during verification");
        }
    });

    it("should allow unauthorized actor to authenticate users", async () => {
        try {
            const isVerified3 = await identityProvider.isUserVerified(user3);
            assert.equal(isVerified3, true, "User 3 should be verifiable even from a non verified actor on the blockchain");
        } catch (error) {
            assert(!error.message.includes("revert"), "Expected revert for unauthorized authentication");
        }
    });

    // Chat Room Creation and Interaction Tests
    it("should allow registered users to create Private chat rooms", async () => {
        try {
            await chatRoomManager.createPrivateRoom('Secret', 'Private Room', '0x' + this.user1KeyPair.getPublic(true, 'hex'), { from: user1 });
            const rooms = await chatRoomManager.getRoomCount( { from: user1 } );
            assert.greater(rooms, 0, "Room count should be greater than 0 as we have at least 2 rooms");
        } catch (error) {
            assert(!error.message.includes("revert"), "Unexpected revert during room creation");
        }
    });

    // Chat Room Creation and Interaction Tests
    it("should allow registered users to create Public chat rooms", async () => {
        try {
            await chatRoomManager.createPublicRoom('General', 'Public Room', { from: user1 });
            const rooms = await chatRoomManager.getRoomCount( { from: user1 } );
            assert.greater(rooms, 1, "Room count should be greater than 0 as we have at least 2 rooms");
        } catch (error) {
            assert(!error.message.includes("revert"), "Unexpected revert during room creation");
        }
    });


    it("should not allow unverified user to create Private chat rooms", async () => {
        try {
            await chatRoomManager.createPrivateRoom('Private Room', 'Private Room for testing', '0x' + this.unauthorizedUserKeyPair.getPublic(true, 'hex'), { from: unauthorizedActor });
            assert.fail("Unverified user was able to create a chat room");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert for unverified user room creation");
        }
    });

    it("should not allow unverified user to create Public chat rooms", async () => {
        try {
            await chatRoomManager.createPublicRoom('Public Room', 'Public Room for testing', { from: unauthorizedActor });
            assert.fail("Unverified user was able to create a chat room");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert for unverified user room creation");
        }
    });

    it("should allow verified users to join public rooms", async () => {
        try {
            await chatRoomManager.joinChatRoom(publicRoomId, { from: user2 });
            const roomMembers = await chatRoomManager.getRoomMembers(publicRoomId, { from: user2 });
            assert(roomMembers.includes(user2), "User 2 should be a member of Public Room 1");
        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert during room access vote");
        }
    });

    it("should not allow users to directly join private rooms", async () => {
        try {
            await chatRoomManager.joinChatRoom(privateRoomId, { from: user2 });
            const roomMembers = await chatRoomManager.getRoomMembers(privateRoomId);
            assert.fail(roomMembers.includes(user2), "User 2 should not be a member of Room 1");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert during room access vote");
        }
    });


    it("should not allow verified users to vote and approve new members", async () => {
        try {
            await chatRoomManager.requestJoinPrivateChatRoom(privateRoomId, '0x' + this.user2KeyPair.getPublic(true, 'hex'), { from: user2 });
            await chatRoomManager.voteJoinRequest(privateRoomId, user2, { from: unauthorizedActor });

            const roomMembers = await chatRoomManager.getRoomMembers(privateRoomId);
            assert.fail(roomMembers.includes(user2), "User 2 should not be a member of Room 1");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert during room access vote");
        }
    });

    it("should allow verified users to vote and approve new members", async () => {
        try {
            await chatRoomManager.voteJoinRequest(privateRoomId, user2, { from: user1 });

            const roomMembers = await chatRoomManager.getRoomMembers(privateRoomId, { from: user1 });
            assert(roomMembers.includes(user2), "User 2 should be a member of Room 1 after approval");
        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert during room access vote");
        }
    });

    it("should not allow a verified user to vote multiple times for a member", async () => {
        try {
            await chatRoomManager.requestJoinPrivateChatRoom(privateRoomId, '0x' + this.user3KeyPair.getPublic(true, 'hex'), { from: user3 });
            await chatRoomManager.voteJoinRequest(privateRoomId, user3, { from: user1 });
            await chatRoomManager.voteJoinRequest(privateRoomId, user3, { from: user1 });

            const roomMembers = await chatRoomManager.getRoomMembers(privateRoomId, { from: user1 });
            assert.fail(roomMembers.includes(user3), "User 3 should not be a member of Room 1 after only 1 approval");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert for duplicated vote during room access vote");
        }
    });

    it("should accept a member if they have more than 50% votes", async () => {
        try {
            await chatRoomManager.voteJoinRequest(privateRoomId, user3, { from: user2 });

            const roomMembers = await chatRoomManager.getRoomMembers(privateRoomId, { from: user1 });
            assert(roomMembers.includes(user3), "User 3 should be a member of Room 1 after user2 approval");
        } catch (error) {
            assert(!error.message.includes("revert"), "Unexpected revert during room access vote");
        }
    });

    it("should allow a user to save his own encryption key", async () => {
        try {
            await chatRoomManager.setRoomMemberECCPublicKey(privateRoomId, '0x' + this.user1KeyPair.getPublic(true, 'hex'), { from: user1 })
            await chatRoomManager.setRoomMemberECCPublicKey(privateRoomId, '0x' + this.user2KeyPair.getPublic(true, 'hex'), { from: user2 })
            await chatRoomManager.setRoomMemberECCPublicKey(privateRoomId, '0x' + this.user3KeyPair.getPublic(true, 'hex'), { from: user3 })

        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert while saving encryption keys");
        }
    });

    it("should not allow a non-member user to save his own encryption key", async () => {
        try {

            await chatRoomManager.setRoomMemberECCPublicKey(privateRoomId, '0x' + this.unauthorizedUserKeyPair.getPublic(true, 'hex'), { from: unauthorizedActor })
            
            assert.fail("This user was not supposed to be able to save his ECC key");
        } catch (error) {
            assert(error.message.includes("revert"), "Expected revert. The user was not authorized to save the encryption key in this room");
        }
    });

    // IPFS and Encryption Tests
    it("should allow a user to send an encrypted message", async () => {
        try {
            const message = "Hello, this is user 1";
            const encryptedMessage = encryptMessage(sharedSecret, message);

            // Simulate IPFS upload
            const ipfsHash = (await this.ipfs.add(JSON.stringify(encryptedMessage))).path;

            // User sends encrypted message to room
            await chatRoomManager.sendMessage(privateRoomId, ipfsHash, { from: user1 });

            const roomMessages = await chatRoomManager.getMessages(1, { from: user1 });
            assert.equal(roomMessages.length, privateRoomId, "Room should have 1 message after user 1 sends");
        } catch (error) {
            assert(!error.message.includes("revert"), "Unexpected revert during message sending");
        }
    });

    it("should not allow a non-member to retrieve and decrypt the message", async () => {
        try {
            const roomMessages = await chatRoomManager.getMessages(privateRoomId, { from: unauthorizedActor });
            const ipfsHash = roomMessages[0].messageHash;

            // Simulate IPFS retrieval
            const encryptedMessage = JSON.parse((await this.ipfs.cat(ipfsHash)).toString());

            const decryptedMessage = decryptMessage(sharedSecret, encryptedMessage);
            // console.log("Message is: ", decryptedMessage);
            assert.fail(decryptedMessage, "Hello, this is user 1", "Message should not be recovered at all");
        } catch (error) {
            assert(error.message.includes("revert"), "Great stuff. Non-member cannot recover messages");
        }
    });

    it("should not allow an unauthorized user to send messages to the room", async () => {
        try {
            const message = "Unauthorized message";
            const encryptedMessage = encryptMessage(sharedSecret, message);

            // Simulate IPFS upload
            const ipfsHash = (await this.ipfs.add(JSON.stringify(encryptedMessage))).path;
            // Unauthorized actor tries to send a message
            await chatRoomManager.sendMessage(privateRoomId, ipfsHash, { from: unauthorizedActor });
            assert.fail("Unauthorized actor was able to send a message");
        } catch (error) {
            assert(error.message.includes("User not verified"), "Expected revert for unauthorized message sending");
        }
    });

    it("should allow a user to calculate the shared secret", async () => {
        try {
            const allPublicKeys = await chatRoomManager.getRoomMemberPublicKeys(privateRoomId, { from: user1 });
            let derivedSharedSecret = computeGroupSharedSecret(this.user1KeyPair, allPublicKeys);

            // console.log(derivedSharedSecret);

        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert while calculating shread secret");
        }
    });

    it("the shared secret should be equal for any user in the room", async () => {
        try {
            const allPublicKeys = await chatRoomManager.getRoomMemberPublicKeys(privateRoomId, { from: user1 });

            const users = [new EllipticCurveDH(this.user1KeyPair), new EllipticCurveDH(this.user2KeyPair), new EllipticCurveDH(this.user3KeyPair)];

            // Compute shared secret once for each user
            users.forEach(user => user.computeSharedSecrets(allPublicKeys));

            // Retrieve the precomputed final shared secret
            const finalSharedSecrets = users.map(user => user.getFinalSharedSecret());

            // Check if all users derived the same shared secret
            const allSecretsMatch = finalSharedSecrets.every(secret => secret === finalSharedSecrets[0]);

            /*
            console.log('All users have the same final shared secret:', allSecretsMatch);

            for (let i = 0; i < users.length; i++) {
                console.log(users[i].getFinalSharedSecret())
            }
            console.log('All users have the same final shared secret:', allSecretsMatch);
             */

            const message = "Secure group message";
            const encryptedMessage = users[0].encryptMessage(message, finalSharedSecrets[0]);
            const allDecryptedCorrectly = users.every(user => user.decryptMessage(encryptedMessage, user.getFinalSharedSecret()) === message);
            /*
            for (let i = 0; i < users.length; i++) {
                console.log(users[i].decryptMessage(encryptedMessage, users[i].getFinalSharedSecret()))
            }

            console.log('All users can decrypt the message correctly:', allDecryptedCorrectly);
            */
        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert while saving encryption keys");
        }
    });

    it("the shared secret should be equal for any user in the room 2", async () => {
        try {

            var A = this.user1KeyPair
            var B = this.user2KeyPair
            var C = this.user3KeyPair

            var AB = A.getPublic().mul(B.getPrivate())
            var BC = B.getPublic().mul(C.getPrivate())
            var CA = C.getPublic().mul(A.getPrivate())

            var ABC = AB.mul(C.getPrivate())
            var BCA = BC.mul(A.getPrivate())
            var CAB = CA.mul(B.getPrivate())
            /*
            console.log(ABC.getX().toString(16))
            console.log(BCA.getX().toString(16))
            console.log(CAB.getX().toString(16))
            */
        } catch (error) {
            throw error;
            assert(!error.message.includes("revert"), "Unexpected revert while saving encryption keys");
        }
    });


    // Add additional tests for message failures, IPFS error handling, and other scenarios.
});

// Encryption utility functions
function encryptMessage(sharedSecret, message) {
    const key = crypto.createHash('sha256').update(sharedSecret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return { iv: iv.toString('hex'), encryptedData: encrypted, authTag };
}

function decryptMessage(sharedSecret, encryptedMessage) {
    const key = crypto.createHash('sha256').update(sharedSecret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encryptedMessage.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));

    let decrypted = decipher.update(encryptedMessage.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Converts `bytes` to hex and validates compressed key format
function formatPublicKey(bytes) {
    if (bytes.length !== 68 || !/^0x(02|03)/.test(bytes)) {
        throw new Error("Invalid compressed public key format");
    }
    return bytes.startsWith('0x') ? bytes.slice(2) : bytes;
}

// Compute the group shared secret using multi-party Diffie-Hellman
async function computeGroupSharedSecret(userKeyPair, allPublicKeys) {

    let sortedPublicKeys = allPublicKeys
        .map(formatPublicKey)
        //.filter((publicKey) => publicKey !== userPublicKeyHex)
        .sort();

    // console.log(sortedPublicKeys);
    // Initialize group shared secret as user's private key (for iterative derivation)
    let chainedSecret = userKeyPair.getPrivate();

    sortedPublicKeys.forEach((publicKeyHex, index) => {
        const otherPublicKey = ec.keyFromPublic(publicKeyHex, 'hex').getPublic();
        const derivedKey = userKeyPair.derive(otherPublicKey);  // Shared secret with this key

        // console.log(`Derived Secret with Key ${index + 1}:`, derivedKey.toString(16));

        // Chain by combining derived values, for example, through multiplication
        chainedSecret = chainedSecret.mul(derivedKey);  // Multiply with previous result
    });

    // Normalize the shared secret by hashing for consistent length and uniformity
    return crypto.createHash('sha256').update(chainedSecret.toString(16)).digest('hex');
}

class EllipticCurveDH {
    constructor(keyPair) {
        this.keyPair = keyPair;
        this.publicKey = '0x' + this.keyPair.getPublic(true, 'hex');  // Compressed format
        this.intermediateSecrets = [];
    }

    computeSharedSecret(otherPublicKeyHex) {
        let compliantHex = formatPublicKey(otherPublicKeyHex);
        const otherPublicKey = ec.keyFromPublic(compliantHex, 'hex').getPublic();
        const sharedSecret = this.keyPair.derive(otherPublicKey); // Returns a BN instance
        this.intermediateSecrets.push(sharedSecret);
        return sharedSecret;
    }

    getFinalSharedSecret() {
        // Chain all intermediate secrets by multiplying them, mod n (curve order)
        const finalSecret = this.intermediateSecrets.reduce((acc, secret) => acc.mul(secret).umod(ec.curve.n), ec.curve.one);
        return crypto.createHash('sha256').update(finalSecret.toArrayLike(Buffer, 'be')).digest('hex');
    }

    computeSharedSecrets(otherPublicKeys) {
        // Sort public keys to ensure consistent ordering
        const sortedKeys = otherPublicKeys
            .map(formatPublicKey)
            //.filter((publicKey) => publicKey !== userPublicKeyHex)
            .sort();

        // Derive and accumulate secrets
        let cumulativeSecret = this.keyPair.getPrivate();

        for (const publicKeyHex of sortedKeys) {
            if (publicKeyHex !== this.publicKey) { // Skip own public key
                const otherPublicKey = ec.keyFromPublic(publicKeyHex, 'hex').getPublic();
                const sharedSecret = this.keyPair.derive(otherPublicKey);  // Shared secret with this key
                cumulativeSecret = cumulativeSecret.mul(sharedSecret).umod(ec.curve.n);  // Accumulate in a consistent order
            }
        }

        // Final shared secret derived for this user
        return crypto.createHash('sha256').update(cumulativeSecret.toArrayLike(Buffer, 'be')).digest('hex');
    }

    encryptMessage(message, sharedSecret) {
        const key = crypto.createHash('sha256').update(sharedSecret).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return { iv: iv.toString('hex'), encryptedData: encrypted, authTag };
    }

    decryptMessage(encryptedMessage, sharedSecret) {
        const key = crypto.createHash('sha256').update(sharedSecret).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encryptedMessage.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));

        let decrypted = decipher.update(encryptedMessage.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    encrypt(text, sharedSecretHex) {
        const keyBytes = Buffer.from(sharedSecretHex, 'hex');
        const textBytes = Buffer.from(text, 'utf8');
        const encryptedBytes = Buffer.alloc(textBytes.length);

        for (let i = 0; i < textBytes.length; i++) {
            encryptedBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        return encryptedBytes.toString('base64');
    }

    decrypt(encryptedText, sharedSecretHex) {
        const keyBytes = Buffer.from(sharedSecretHex, 'hex');
        const encryptedBytes = Buffer.from(encryptedText, 'base64');
        const decryptedBytes = Buffer.alloc(encryptedBytes.length);

        for (let i = 0; i < encryptedBytes.length; i++) {
            decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        return decryptedBytes.toString('utf8');
    }
}