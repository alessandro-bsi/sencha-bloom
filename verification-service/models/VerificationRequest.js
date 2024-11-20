const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema({
    name: String,
    ssn: String,
    userAddress: String,
    document: String,  // Path to the uploaded document
    status: { type: String, enum: ['pending', 'verified'], default: 'pending' },
});

module.exports = mongoose.model('VerificationRequest', VerificationRequestSchema);
