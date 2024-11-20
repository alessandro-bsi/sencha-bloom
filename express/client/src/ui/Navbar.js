import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setupWeb3, web3 } from '../web3Config';

function Navbar() {
    const [account, setAccount] = useState('');

    useEffect(() => {
        const loadAccount = async () => {
            await setupWeb3();
            const accounts = await web3.eth.getAccounts();
            setAccount(accounts[0]); // Set the first account as the current account
        };

        loadAccount();
    }, []);

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">Blockchain Chat</Link>
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link className="nav-link" to="/">Home</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/verify">Verify</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/rooms">Rooms</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/verification-admin">Admin</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/submit-documents">Submit Documents</Link>
                        </li>
                    </ul>
                    <span className="navbar-text">
                        {account ? `Account: ${account}` : 'Loading account...'}
                    </span>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
