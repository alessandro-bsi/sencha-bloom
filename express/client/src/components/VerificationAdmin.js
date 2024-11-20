import React, { useState, useEffect } from 'react';
import axios from 'axios';

function VerificationAdmin() {
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        fetchVerificationRequests();
    }, []);

    const fetchVerificationRequests = async () => {
        const response = await axios.get(`${process.env.REACT_APP_VER_API_URL}/api/verification/requests`);
        setRequests(response.data);
    };

    const verifyRequest = async (id) => {
        try {
            const response = await axios.put(`${process.env.REACT_APP_VER_API_URL}/api/verification/${id}/verify`);

            if (response.status === 200) {
                alert("User successfully verified!");
            }
        } catch (error) {
            console.error("Error verifying user:", error);
            alert("Failed to verify user. Please try again.");
        }
        fetchVerificationRequests();
    };

    const deleteRequest = async (id) => {
        await axios.delete(`${process.env.REACT_APP_VER_API_URL}/api/verification/${id}`);
        fetchVerificationRequests();
    };

    return (
        <div className="container mt-5">
            <h1>Pending Verification Requests</h1>
            <table className="table">
                <thead>
                <tr>
                    <th>Name</th>
                    <th>SSN</th>
                    <th>Document</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {requests.map((request) => (
                    <tr key={request._id}>
                        <td>{request.name}</td>
                        <td>{request.ssn}</td>
                        <td><a href={`${process.env.REACT_APP_VER_API_URL}/${request.document}`} target="_blank" rel="noopener noreferrer">View Document</a></td>
                        <td>
                            <button onClick={() => verifyRequest(request._id)}>Verify</button>
                            <button onClick={() => deleteRequest(request._id)}>Delete</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default VerificationAdmin;
