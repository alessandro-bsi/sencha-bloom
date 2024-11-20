require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const EC = require('elliptic').ec;
const cors = require('cors');

const ec = new EC('secp256k1');
const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME;

// Global service keypair
const serviceKeyPair = ec.genKeyPair();

// Mongoose models
const nonceSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    nonce: { type: String, required: true },
    publicKeysCount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});
const secretSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    secret: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Nonce = mongoose.model('Nonce', nonceSchema);
const Secret = mongoose.model('Secret', secretSchema);

// Connect to MongoDB
mongoose.connect(`${mongoUri}/${dbName}`, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Helper: Check if a shared secret is valid or needs regeneration
const isSecretExpired = (createdAt) => {
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(createdAt).getTime()) > tenDaysInMs;
};

// GET /api/secret/:roomId
app.get('/api/secret/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { userId, userPublicKey } = req.query;

    try {
        let web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_SERVER));
        let chatContract;
        let serviceAddress;

        // Use the deployed address for the contract from the ABI file and network data
        const networkId = await web3.eth.net.getId();
        const networkData = contractABI.networks[networkId];
        const index = process.env.SERVICE_ADDRESS_INDEX;

        if (networkData) {
            chatContract = new web3.eth.Contract(contractABI.abi, networkData.address);
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > index) {
                serviceAddress = accounts[index];
                console.log(`Service address set to account at index ${index}: ${serviceAddress}`);
            } else {
                throw new Error(`No account found at index ${index}`);
            }

        }

        // Validate membership and public key
        const isMember = await chatContract.methods.userIsMemberOf(userId, roomId).call({ from: serviceAddress });
        if (!isMember) return res.status(403).json({ error: 'User is not a member of the room' });

        const blockchainPublicKey = await chatContract.methods.getRoomMemberPublicKey(userId, roomId).call({ from: serviceAddress });
        if (!blockchainPublicKey || blockchainPublicKey === '0x') {
            return res.status(403).json({ error: 'User does not have a valid public key in the room' });
        }
        if (blockchainPublicKey !== userPublicKey) {
            return res.status(403).json({ error: 'Public key mismatch' });
        }

        // Fetch the current public key count from the blockchain
        const publicKeys = await chatContract.methods.getRoomMemberPublicKeys(roomId).call({ from: serviceAddress });
        const currentPublicKeysCount = publicKeys.length;

        // Retrieve or update nonce
        let roomNonce = await Nonce.findOne({ roomId });
        if (!roomNonce || roomNonce.publicKeysCount !== currentPublicKeysCount) {
            const newNonce = crypto.randomBytes(16).toString('hex');
            if (!roomNonce) {
                roomNonce = new Nonce({ roomId, nonce: newNonce, publicKeysCount: currentPublicKeysCount });
            } else {
                roomNonce.nonce = newNonce;
                roomNonce.publicKeysCount = currentPublicKeysCount;
                roomNonce.createdAt = Date.now(); // Update timestamp
            }
            await roomNonce.save();
        }

        // Encrypt nonce with the user's and service's public keys
        const userKey = ec.keyFromPublic(userPublicKey, 'hex');
        const encryptedNonce = userKey.encrypt(roomNonce.nonce, 'hex');

        res.json({
            challenge: encryptedNonce,
            servicePublicKey: serviceKeyPair.getPublic('hex')
        });
    } catch (error) {
        console.error('Error in GET /api/secret/:roomId:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/secret/:roomId
app.post('/api/secret/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { userId, userPublicKey, encryptedNonce } = req.body;

    try {

        let web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_SERVER));
        let chatContract;
        let serviceAddress;

        // Use the deployed address for the contract from the ABI file and network data
        const networkId = await web3.eth.net.getId();
        const networkData = contractABI.networks[networkId];
        const index = process.env.SERVICE_ADDRESS_INDEX;

        if (networkData) {
            chatContract = new web3.eth.Contract(contractABI.abi, networkData.address);
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > index) {
                serviceAddress = accounts[index];
                console.log(`Service address set to account at index ${index}: ${serviceAddress}`);
            } else {
                throw new Error(`No account found at index ${index}`);
            }

        }

        // Retrieve and validate nonce
        const roomNonce = await Nonce.findOne({ roomId });
        if (!roomNonce) return res.status(404).json({ error: 'Nonce not found for this room' });

        const decryptedNonce = serviceKeyPair.decrypt(Buffer.from(encryptedNonce, 'hex'), 'utf8');
        if (decryptedNonce !== roomNonce.nonce) {
            return res.status(403).json({ error: 'Invalid nonce' });
        }

        // Validate membership and public key
        const isMember = await chatContract.methods.isMember(userId, roomId).call({ from: serviceAddress });
        if (!isMember) return res.status(403).json({ error: 'User is not a member of the room' });

        const blockchainPublicKey = await chatContract.methods.getRoomMemberPublicKey(userId, roomId).call({ from: serviceAddress });
        if (!blockchainPublicKey || blockchainPublicKey === '0x') {
            return res.status(403).json({ error: 'User does not have a valid public key in the room' });
        }
        if (blockchainPublicKey !== userPublicKey) {
            return res.status(403).json({ error: 'Public key mismatch' });
        }

        // Retrieve or generate shared secret
        let roomSecret = await Secret.findOne({ roomId });
        if (!roomSecret || isSecretExpired(roomSecret.createdAt)) {
            // Generate new shared secret
            const publicKeys = await chatContract.methods.getRoomMemberPublicKeys(roomId).call({ from: serviceAddress });
            let sharedSecret = ec.keyFromPrivate(userId).getPrivate(); // Use userId as private key simulation
            publicKeys.forEach((pubKey) => {
                const memberKey = ec.keyFromPublic(pubKey, 'hex');
                sharedSecret = sharedSecret.mul(memberKey.getPublic());
            });

            const newSecret = sharedSecret.toString(16);
            if (!roomSecret) {
                roomSecret = new Secret({ roomId, secret: newSecret });
            } else {
                roomSecret.secret = newSecret;
                roomSecret.createdAt = Date.now();
            }
            await roomSecret.save();
        }

        // Encrypt shared secret with user's public key
        const userKey = ec.keyFromPublic(userPublicKey, 'hex');
        const encryptedSharedSecret = userKey.encrypt(roomSecret.secret, 'hex');

        res.json({ secret: encryptedSharedSecret });
    } catch (error) {
        console.error('Error in POST /api/secret/:roomId:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Initialize Web3 and start the server
(async () => {
    try {
        app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
        app.listen(port, '0.0.0.0', () => console.log(`Server running on http://localhost:${port}`));
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
})();
