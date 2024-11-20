import React, { useState } from 'react';
import axios from 'axios';
import { setupWeb3, web3, chatContract, _ } from '../web3Config';
import { useHistory } from 'react-router-dom';

function DocumentSubmission() {
    const [name, setName] = useState('');
    const [ssn, setSSN] = useState('');
    const [document, setDocument] = useState(null);
    const [status, setStatus] = useState(null);
    const history = useHistory();

    const handleFileChange = (e) => setDocument(e.target.files[0]);

    // Submit document verification request to server
    const submitVerificationRequest = async () => {
        try {
            await setupWeb3();
            const accounts = await web3.eth.getAccounts();
            const userAddress = accounts[0];

            const formData = new FormData();
            formData.append('name', name);
            formData.append('ssn', ssn);

            formData.append('userAddress', userAddress);
            formData.append('document', document);

            await axios.post(process.env.REACT_APP_VER_API_URL + '/api/verification/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setStatus('Verification request submitted successfully. Now you need to wait an authority to verify it...');

        } catch (error) {
            console.error('Error submitting verification request:', error);
            setStatus('Error submitting verification request. Please try again.');
        }
    };

    return (
        <div className="container text-center mt-5">
            <h1>Document Submission</h1>
            <p>Submit your information for identity verification.</p>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="form-control my-2"
            />
            <input
                type="text"
                value={ssn}
                onChange={(e) => setSSN(e.target.value)}
                placeholder="SSN"
                className="form-control my-2"
            />
            <input type="file" onChange={handleFileChange} className="form-control my-2" />
            <button className="btn btn-primary" onClick={submitVerificationRequest}>
                Submit Verification Request
            </button>
            {status && <p className="mt-3">{status}</p>}
        </div>
    );
}

export default DocumentSubmission;
