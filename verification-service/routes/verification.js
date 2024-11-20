const QRCode = require("qrcode");
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const VerificationRequest = require('../models/VerificationRequest');
const contractABI = require("../artifacts/IdentityProvider.json");
const Web3 = require("web3");

const router = express.Router();

// Define the upload directory (restrict uploads to this directory)
const UPLOADS_DIR = path.join(__dirname, '../uploads'); // Adjust path as needed
const CODES_DIR = path.join(__dirname, '../codes'); // Adjust path as needed

// Configure multer with storage and file filter options
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Use a timestamp to ensure a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// File filter to only allow specific file types (e.g., PDFs)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
};

// Set up multer with defined storage, limits, and file filter
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: fileFilter
});

router.post('/submit', upload.single('document'), async (req, res) => {
    try {
        const { name, ssn, userAddress } = req.body;

        // Verify that the uploaded file is saved within the correct directory
        const documentPath = req.file ? path.resolve(req.file.path) : null;
        if (!documentPath.startsWith(UPLOADS_DIR)) {
            throw new Error('Invalid file upload path');
        }

        const documentFilename = path.join(UPLOADS_DIR, req.file.filename); // Full path with the unique filename

        // Create and save verification request in the database
        const request = new VerificationRequest({
            name,
            ssn,
            userAddress,
            document: documentFilename,
        });
        await request.save();

        res.status(201).json({ message: 'Verification request submitted successfully.' });
    } catch (error) {
        console.error('Error saving verification request:', error);
        res.status(500).json({ error: 'Error submitting verification request' });
    }
});

// Get all pending verification requests
router.get('/requests', async (req, res) => {
    try {
        const requests = await VerificationRequest.find({ status: 'pending' });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch verification requests' });
    }
});

// Get a specific verification request by userAddress
router.get('/requests/:userAddress', async (req, res) => {
    const { userAddress } = req.params;
    try {
        // Fetch the verification request by userAddress and pending status
        const request = await VerificationRequest.findOne({ userAddress, status: 'pending' });

        if (request) {
            res.json({ isSubmitted: true, request });
        } else {
            res.json({ isSubmitted: false });
        }
    } catch (error) {
        console.error('Error fetching verification request by userAddress:', error);
        res.status(500).json({ error: 'Failed to fetch verification request' });
    }
});

// Verification endpoint to verify and register the user on-chain
router.put('/:id/verify', async (req, res) => {
    try {
        const request = await VerificationRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Verification request not found' });
        }

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

        // Generate claim data
        const claimData = `[Verified Identity] ${request.userAddress}: ${request.name} - ${request.ssn}`;

        const claimIdBuffer = crypto.createHash('sha256').update(claimData).digest(); // 32-byte Buffer
        const claimId = '0x' + claimIdBuffer.toString('hex'); // Convert Buffer to a hex string for bytes32

        // Sign the claim data
        const signature = await web3.eth.sign(claimId, serviceAddress);
        // Generate QR code URL for claim
        const claimUrl = `${req.protocol}://${req.get('host')}/verify/${claimId}`;
        const qrCodePath = path.join(CODES_DIR, `${claimId}.png`);

        await QRCode.toFile(qrCodePath, claimUrl);

        const address = request.userAddress;

        console.log(`User     : ${address}`)
        console.log(`Claim ID : ${claimId}`)
        console.log(`Signature: ${signature}`)
        console.log(`Data     : ${claimData}`)
        console.log(`URL      : ${claimUrl}`)

        // Register user on-chain
        let registrationReceipt  = await chatContract.methods.register(
            address,
            claimId,
            signature,
            claimData,
            claimUrl
        ).send({ from: serviceAddress, gas: 10000000 });

        console.log("Transaction Receipt:", registrationReceipt);

        // Access emitted events
        if (registrationReceipt.events) {
            console.log("Emitted Events:", registrationReceipt.events);
        }

        let authenticationReceipt  = await chatContract.methods.authenticate(
            address,
            claimId
        ).send({from: serviceAddress, gas: 10000000});

        console.log("Transaction Receipt:", authenticationReceipt);

        // Access emitted events
        if (authenticationReceipt.events) {
            console.log("Emitted Events:", authenticationReceipt.events);
        }

        // Mark as verified in the database
        await VerificationRequest.findByIdAndUpdate(req.params.id, {status: 'verified'});

        res.json({
            message: 'Request verified and user registered on-chain',
            claimUrl,
            qrCodePath,
        });
     } catch (error) {
        console.error('Error verifying and registering user:', error);
        res.status(500).json({ error: 'Failed to verify and register user', trace: JSON.stringify(error, Object.getOwnPropertyNames(error)) });
    }
});


// Delete request
router.delete('/:id', async (req, res) => {
    try {
        await VerificationRequest.findByIdAndDelete(req.params.id);
        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete request' });
    }
});

module.exports = router;
