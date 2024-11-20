import React, { useState, useEffect } from 'react';
import { setupWeb3, web3, chatContract } from '../web3Config';
import { useHistory } from 'react-router-dom';
import { ec as EC } from 'elliptic';

const ec = new EC("secp256k1");

function Rooms() {
    const [rooms, setRooms] = useState([]);
    const [userAddress, setUserAddress] = useState(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [isPublicRoom, setIsPublicRoom] = useState(true);
    const [buttonStates, setButtonStates] = useState([]);
    const history = useHistory();

    const loadRooms = async () => {
        await setupWeb3();
        const accounts = await web3.eth.getAccounts();
        setUserAddress(accounts[0]);

        console.log(accounts[0]);
        console.log(userAddress);

        const roomCount = await chatContract.methods.getRoomCount().call({ from: accounts[0] });

        // Build the rooms array in JavaScript by accessing `chatRooms[]` directly
        const roomsList = [];
        for (let i = 1; i <= roomCount; i++) {
            const room = await chatContract.methods.chatRooms(i).call({ from: accounts[0] });
            roomsList.push({
                name: room.name || room[0],             // Use the descriptive key or fallback to numeric key
                description: room.description || room[1],
                isPrivate: room.isPrivate || room[2],
            });
        }

        console.log(roomsList);
        setRooms(roomsList);
    };

    // Load available rooms and set button states on page load
    useEffect(() => {
        loadRooms();
    }, []);

    useEffect(() => {
        const initializeButtonStates = async () => {
            const states = await Promise.all(
                rooms.map(async (room, index) => {
                    const roomId = index + 1;
                    const isMember = await chatContract.methods.isMemberOf(roomId).call({ from: userAddress });
                    const hasRequested = await chatContract.methods.hasRequestedToJoin(roomId).call({ from: userAddress });

                    if (isMember) {
                        return { roomId: roomId, text: 'Enter', class: 'btn-success', action: () => enterRoom(roomId), disabled: false };
                    } else if (hasRequested) {
                        return { roomId: roomId, text: 'Waiting', class: 'btn-secondary', disabled: true };
                    } else {
                        return { roomId: roomId, text: 'Join', class: 'btn-primary', action: () => joinRoom(roomId), disabled: false };
                    }
                })
            );
            setButtonStates(states);
        };

        if (rooms.length > 0 && userAddress) {
            initializeButtonStates();
        }
    }, [rooms, userAddress]);

    // Retrieve or generate the user's key pair (stored locally)
    const getOrGenerateKeyPair = () => {
        const storedPrivateKey = localStorage.getItem('userPrivateKey');
        const storedPublicKey = localStorage.getItem('userPublicKey');

        if (storedPrivateKey && storedPublicKey) {
            return ec.keyFromPrivate(storedPrivateKey, 'hex');
        } else {
            const newKeyPair = ec.genKeyPair();
            localStorage.setItem('userPrivateKey', '0x' + newKeyPair.getPrivate('hex'));
            localStorage.setItem('userPublicKey', '0x' + newKeyPair.getPublic(true, 'hex'));
            return newKeyPair;
        }
    };

    // Handle adding a new room
    const handleAddRoom = async () => {
        if (!newRoomName || !newRoomDescription) {
            alert('Please provide a room name and description');
            return;
        }

        let createRoomReceipt;
        try {
            if (isPublicRoom) {
                createRoomReceipt = await chatContract.methods.createPublicRoom(newRoomName, newRoomDescription).send({ from: userAddress });
            } else {
                const creatorPublicKey = '0x' + getOrGenerateKeyPair().getPublic(true, "hex");
                createRoomReceipt = await chatContract.methods.createPrivateRoom(newRoomName, newRoomDescription, creatorPublicKey).send({ from: userAddress });
            }

            console.log("Transaction Receipt:", createRoomReceipt);
            if(createRoomReceipt){
                // Access emitted events
                if (createRoomReceipt.events) {
                    console.log("Emitted Events:", createRoomReceipt.events);
                }
            }

            setNewRoomName('');
            setNewRoomDescription('');
            setIsPublicRoom(true);
            alert('Room created successfully!');
            await loadRooms(); // Reload rooms after adding a new one
        } catch (error) {
            console.error('Error creating room:', error);
        }
    };

    // Join a room
    const joinRoom = async (roomId) => {
        try {
            const creatorPublicKey = getOrGenerateKeyPair().getPublic(true, "hex");
            await chatContract.methods.requestAccessToRoom(roomId, creatorPublicKey).send({ from: userAddress });
            await loadRooms(); // Reload rooms to update button states
        } catch (error) {
            console.error('Error requesting access to room:', error);
        }
    };

    // Enter a room
    const enterRoom = (roomId) => {
        history.push(`/chat/${roomId}`);
    };

    return (
        <div className="container mt-5">
            <h1>Available Chat Rooms</h1>

            {/* Add New Room Form */}
            <div className="card mb-4">
                <div className="card-body">
                    <h4 className="card-title">Add a New Room</h4>
                    <div className="form-group">
                        <label>Room Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Enter room name"
                        />
                    </div>
                    <div className="form-group mt-3">
                        <label>Room Description</label>
                        <textarea
                            className="form-control"
                            value={newRoomDescription}
                            onChange={(e) => setNewRoomDescription(e.target.value)}
                            placeholder="Enter room description"
                        />
                    </div>
                    <div className="form-check mt-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isPublicRoom}
                            onChange={() => setIsPublicRoom(!isPublicRoom)}
                        />
                        <label className="form-check-label">
                            Public Room
                        </label>
                    </div>
                    <button className="btn btn-primary mt-3" onClick={handleAddRoom}>
                        Add Room
                    </button>
                </div>
            </div>

            {/* List of Available Rooms */}
            <table className="table table-striped">
                <thead>
                <tr>
                    <th>Room ID</th>
                    <th>Room Name</th>
                    <th>Room Description</th>
                    <th>Action</th>
                </tr>
                </thead>
                <tbody>
                {rooms.map((room, index) => {
                    const roomId = index + 1;
                    const buttonState = buttonStates.find(state => state.roomId === roomId) || { text: 'Loading...', class: 'btn-secondary', disabled: true };

                    return (
                        <tr key={roomId}>
                            <td>{roomId}</td>
                            <td>{room.name}</td>
                            <td>{room.description}</td>
                            <td>
                                <button
                                    className={`btn ${buttonState.class}`}
                                    onClick={buttonState.disabled ? null : buttonState.action}
                                    disabled={buttonState.disabled}
                                >
                                    {buttonState.text}
                                </button>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}

export default Rooms;
