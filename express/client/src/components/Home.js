import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
    return (
        <div className="container text-center mt-5">
            <h1>Welcome to Blockchain Chat</h1>
            <p className="lead">A decentralized chat application on the Ethereum blockchain.</p>
            <Link to="/verify" className="btn btn-primary">
                Register / Verify Identity
            </Link>
        </div>
    );
}

export default Home;
