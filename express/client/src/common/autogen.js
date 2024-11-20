const Web3 = require('web3');
const EC = require('elliptic').ec;
const crypto = require('crypto');
const IPFS = require('ipfs-http-client');

const web3 = new Web3('http://localhost:7545'); // Connect to Ganache
const ec = new EC('secp256k1');  // Elliptic curve for ECDH
const ipfs = IPFS.create({ host: 'localhost', port: '5001', protocol: 'http' }); // IPFS setup

// Import the compiled contract ABIs
const IdentityProviderABI = require('../artifacts/IdentityProvider.json');
const IdentityABI = require('../artifacts/Identity.json');
const ChatRoomManagerABI = require('../artifacts/ChatRoomManager.json');

export async function loadGanacheAccounts() {
    const options = { a: 20 };
    let accounts= await new Web3(new Web3.providers.HttpProvider('http://172.27.96.1:7545', options)).eth
        .getAccounts((err, accounts) => {
            console.log(err, accounts);
        });

    if(Array.isArray(accounts) && accounts.length > 0){
        return accounts;
    }
    return [];
}


// Utility function to get deployed contract address from ABI using network ID
async function getContractInstance(contractABI) {
    const networkId = await web3.eth.net.getId(); // Get network ID (Ganache uses 5777 by default)
    const networkData = contractABI.networks[networkId];
    if (networkData) {
        return new web3.eth.Contract(contractABI.abi, networkData.address);
    } else {
        throw new Error('Contract not deployed on this network');
    }
}

// Generate ECDH key pair for each user (simulate stored keys)
function generateKeyPair() {
    const keyPair = ec.genKeyPair();
    return {
        publicKey: keyPair.getPublic('hex'),
        privateKey: keyPair.getPrivate('hex')
    };
}

// Derive shared secret using ECDH
function deriveSharedSecret(userPrivateKey, otherPublicKey) {
    const userKeyPair = ec.keyFromPrivate(userPrivateKey, 'hex');
    const otherKeyPair = ec.keyFromPublic(otherPublicKey, 'hex');
    const sharedSecret = userKeyPair.derive(otherKeyPair.getPublic());
    return sharedSecret.toString(16);  // Convert to hex
}

// AES-GCM encryption
function encryptMessage(sharedSecret, message) {
    const symmetricKey = crypto.createHash('sha256').update(sharedSecret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);

    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return { iv: iv.toString('hex'), encryptedData: encrypted, authTag };
}

// AES-GCM decryption
function decryptMessage(sharedSecret, encryptedMessage) {
    const symmetricKey = crypto.createHash('sha256').update(sharedSecret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, Buffer.from(encryptedMessage.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));

    let decrypted = decipher.update(encryptedMessage.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Upload encrypted message to IPFS
async function uploadToIPFS(encryptedMessage) {
    const buffer = Buffer.from(JSON.stringify(encryptedMessage));  // Convert message to buffer
    const result = await ipfs.add(buffer);  // Upload to IPFS
    return result.path;  // Return the IPFS hash
}

// Retrieve encrypted message from IPFS
async function retrieveFromIPFS(hash) {
    const stream = ipfs.cat(hash);
    let data = '';
    for await (const chunk of stream) {
        data += chunk.toString();
    }
    return JSON.parse(data);  // Parse the encrypted message
}

// Simulate blockchain state with encryption, decryption, and IPFS
async function simulateBlockchainState() {
    const accounts = await web3.eth.getAccounts();

    const authority = accounts[0];  // Authority (e.g., a bank)
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];

    // Generate key pairs for users (simulate key storage)
    const user1KeyPair = generateKeyPair();
    const user2KeyPair = generateKeyPair();
    const user3KeyPair = generateKeyPair();

    console.log('Authority:', authority);
    console.log('User 1:', user1, 'Public Key:', user1KeyPair.publicKey);
    console.log('User 2:', user2, 'Public Key:', user2KeyPair.publicKey);
    console.log('User 3:', user3, 'Public Key:', user3KeyPair.publicKey);

    // Get contract instances dynamically
    const identityProvider = await getContractInstance(IdentityProviderABI);
    const chatRoomManager = await getContractInstance(ChatRoomManagerABI);

    // Register users with the IdentityProvider
    console.log('Registering users...');
    await identityProvider.methods.register().send({ from: user1, gas: 3000000 });
    await identityProvider.methods.register().send({ from: user2, gas: 3000000 });
    await identityProvider.methods.register().send({ from: user3, gas: 3000000 });

    // Fetch the identity contracts for each user
    const user1IdentityAddress = await identityProvider.methods.userIdentities(user1).call();
    const user2IdentityAddress = await identityProvider.methods.userIdentities(user2).call();
    const user3IdentityAddress = await identityProvider.methods.userIdentities(user3).call();

    const user1Identity = new web3.eth.Contract(IdentityABI.abi, user1IdentityAddress);
    const user2Identity = new web3.eth.Contract(IdentityABI.abi, user2IdentityAddress);
    const user3Identity = new web3.eth.Contract(IdentityABI.abi, user3IdentityAddress);

    console.log('User 1 Identity:', user1IdentityAddress);
    console.log('User 2 Identity:', user2IdentityAddress);
    console.log('User 3 Identity:', user3IdentityAddress);

    // Issue claims for users (by the authority)
    console.log('Issuing claims...');
    const claimData = web3.utils.sha3('User identity claim');
    const claimSignature = await web3.eth.sign(claimData, authority);  // Authority signs the claim data

    await user1Identity.methods.addClaim(
        1,  // Claim type
        authority,  // Issuer (authority)
        claimSignature,  // Signature of the claim
        claimData,  // Data for the claim
        'https://example.com'  // URI for additional info (off-chain)
    ).send({ from: authority });

    await user2Identity.methods.addClaim(
        1,
        authority,
        claimSignature,
        claimData,
        'https://example.com'
    ).send({ from: authority });

    // Create chat rooms
    console.log('Creating chat rooms...');
    await chatRoomManager.methods.createRoom('General', 'General discussion room', true).send({ from: user1, gas: 3000000 });
    await chatRoomManager.methods.createRoom('PrivateRoom', 'Private discussion room', false).send({ from: user2, gas: 3000000 });

    const rooms = await chatRoomManager.methods.getRooms().call();
    console.log('Available rooms:', rooms);

    // Derive shared secret between users for encryption
    const sharedSecret1 = deriveSharedSecret(user1KeyPair.privateKey, user3KeyPair.publicKey);
    const sharedSecret2 = deriveSharedSecret(user2KeyPair.privateKey, user3KeyPair.publicKey);

    // User 1 sends an encrypted message to Room 1, message is uploaded to IPFS
    console.log('User 1 sends an encrypted message...');
    const message1 = 'Hello, this is user 1';
    const encryptedMessage1 = encryptMessage(sharedSecret1, message1);
    const ipfsHash1 = await uploadToIPFS(encryptedMessage1);

    // Store the IPFS hash in the chat room (on-chain)
    await chatRoomManager.methods.writeMessage(rooms[0].roomId, ipfsHash1).send({ from: user1, gas: 3000000 });

    // User 3 retrieves and decrypts the message from IPFS
    console.log('User 3 retrieves and decrypts the message...');
    const retrievedMessage1 = await retrieveFromIPFS(ipfsHash1);
    const decryptedMessage1 = decryptMessage(sharedSecret1, retrievedMessage1);
    console.log('Decrypted message:', decryptedMessage1);

    console.log('Simulation complete.');
}

// Execute the simulation
simulateBlockchainState().then(() => {
    console.log('All users, rooms, and messages set up on Ganache with encryption and IPFS.');
}).catch(err => {
    console.error('Error during simulation:', err);
});
