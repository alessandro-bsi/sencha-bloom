import React, { useState, useEffect } from 'react';
import { setupWeb3, web3, chatContract, _ } from '../web3Config';
import { useHistory } from 'react-router-dom';

function Verification() {
    const [isRegistered, setIsRegistered] = useState(false);
    const [status, setStatus] = useState(null);
    const history = useHistory();

    // Check registration status on component mount
    useEffect(() => {
        const checkRegistration = async () => {
            try {
                await setupWeb3();
                const accounts = await web3.eth.getAccounts();
                const userAddress = accounts[0];

                // Check if the user is registered
                const registered = await chatContract.methods.isVerified(userAddress).call();
                if (registered) {
                    // Redirect to rooms list if already registered
                    history.push('/rooms');
                } else {
                    setIsRegistered(false);
                }
            } catch (error) {
                console.error("Error checking registration:", error);
            }
        };

        checkRegistration();
    }, [history]);

    // Redirect to document submission page
    const handleVerifyClick = () => {
        history.push('/submit-documents');
    };

    return (
        <div className="container text-center mt-5">
            <h1>Identity Verification</h1>
            <p>Verify your identity to access chat rooms.</p>
            {!isRegistered && (
                <button className="btn btn-primary" onClick={handleVerifyClick}>
                    Verify your Identity
                </button>
            )}
            {status && <p className="mt-3">{status}</p>}
        </div>
    );
}

export default Verification;
