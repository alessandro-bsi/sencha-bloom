import React, { useState, useEffect } from 'react';
import { setupWeb3, web3, chatContract, _ } from '../web3Config';
import { useParams, useHistory } from 'react-router-dom';

function JoinRequest() {
    const { roomId } = useParams();  // Get room ID from URL params
    const [userAddress, setUserAddress] = useState(null);
    const [joinRequests, setJoinRequests] = useState([]);
    const history = useHistory();

    // Load join requests when the component mounts
    useEffect(() => {
        const loadJoinRequests = async () => {
            await setupWeb3();
            const accounts = await web3.eth.getAccounts();
            setUserAddress(accounts[0]);

            const isMember = await chatContract.methods.isMember(accounts[0], roomId).call();
            if (!isMember) {
                alert('You are not a member of this chat room!');
                history.push(`/chat/${roomId}`);
            }

            const requests = await chatContract.methods.getJoinRequests(roomId).call();
            setJoinRequests(requests);
        };
        loadJoinRequests();
    }, [roomId, history]);

    // Cast a vote to approve a join request
    const voteJoinRequest = async (applicant) => {
        try {
            await chatContract.methods.voteJoinRequest(roomId, applicant).send({ from: userAddress });
            alert('Vote cast successfully!');
            loadJoinRequests();  // Reload the join requests
        } catch (error) {
            console.error('Error voting on join request:', error);
        }
    };

    return (
        <div className="container mt-5">
            <h1>Join Requests for Room {roomId}</h1>
            {joinRequests.length === 0 ? (
                <p>No join requests available.</p>
            ) : (
                <table className="table table-striped">
                    <thead>
                    <tr>
                        <th>Applicant Address</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {joinRequests.map((applicant, idx) => (
                        <tr key={idx}>
                            <td>{applicant}</td>
                            <td>
                                <button className="btn btn-success" onClick={() => voteJoinRequest(applicant)}>
                                    +1
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default JoinRequest;
