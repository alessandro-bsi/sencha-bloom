require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const verificationRoutes = require('./routes/verification');
const { setupWeb3, web3, chatContract, serviceAddress } = require('./web3Config.js');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/api/verification', verificationRoutes);

// Connect to MongoDB
const mongoUri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME;

// Connect to MongoDB with the specified database name
mongoose.connect(`${mongoUri}/${dbName}`)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

const startServer = async () => {
    try {
        await setupWeb3();  // Ensure web3 and chatContract are initialized
        console.log('Web3 setup complete');

        // Start the server only after web3 setup is done
        const PORT = process.env.PORT || 5001;

        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        app.use('/codes', express.static(path.join(__dirname, 'codes')));

        app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true, // If credentials are needed (cookies, etc.)
        }));
        app.listen(PORT, "0.0.0.0", () => console.log(`Verification Service running on port ${PORT}`));

    } catch (error) {
        console.error('Error during setupWeb3:', error);
        process.exit(1); // Exit if setupWeb3 fails
    }
};

// Initialize Web3 and start the server
startServer();
