import Web3 from "web3";

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

export async function loadWeb3() {
    if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
    } else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider);
    } else {
        throw Error("This application requires an Ethereum browser to operate");
    }
};


export async function loadCurrentUser() {
    const accounts = await loadAccounts();
    if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts[0];
    } else {
        throw Error("Error fetching current account");
    }
}

export async function loadAccounts() {
    const web3 = window.web3;
    const accounts = await web3.eth.getAccounts();
    if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts;
    } else {
        throw Error("Error fetching accounts");
    }
}

export async function loadBlockchainDataRaw () {
    const web3 = window.web3;
    const networkId = await web3.eth.net.getId();
    const networkData = SupplyChainABI.networks[networkId];
    if (networkData) {
        return networkData;
    } else {
        throw Error("Error connecting to contract");
    }
}

// Utility function to encrypt data (using AES-GCM)
async function encryptData(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const enc = new TextEncoder();
    const encoded = enc.encode(data);

    const cipherText = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: iv
    }, key, encoded);

    return { cipherText: new Uint8Array(cipherText), iv };
}

// Utility function to decrypt data
async function decryptData(key, encryptedData, iv) {
    const decrypted = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv: iv
    }, key, encryptedData);

    return new TextDecoder().decode(decrypted);
}

// Function to generate a new ECC key pair
function generateKeyPair() {
    const keyPair = ec.genKeyPair();
    return {
        privateKey: keyPair.getPrivate('hex'),
        publicKey: keyPair.getPublic('hex')
    };
}

// Function to store Alice's key pair securely (encrypt the private key)
async function storeKeyPair(privateKey, publicKey, password) {
    // Derive an AES key from the password
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: crypto.getRandomValues(new Uint8Array(16)),
        iterations: 100000,
        hash: 'SHA-256'
    }, keyMaterial, {
        name: 'AES-GCM',
        length: 256
    }, false, ['encrypt', 'decrypt']);

    // Encrypt the private key
    const { cipherText, iv } = await encryptData(key, privateKey);

    // Store encrypted private key and public key in localStorage
    localStorage.setItem('encryptedPrivateKey', JSON.stringify({ cipherText, iv }));
    localStorage.setItem('publicKey', publicKey);
}

// Function to retrieve the key pair from storage (decrypt the private key)
async function retrieveKeyPair(password) {
    const encryptedPrivateKeyData = JSON.parse(localStorage.getItem('encryptedPrivateKey'));
    const publicKey = localStorage.getItem('publicKey');

    if (!encryptedPrivateKeyData || !publicKey) {
        return null; // No key pair stored
    }

    // Derive the AES key from the password
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: crypto.getRandomValues(new Uint8Array(16)),
        iterations: 100000,
        hash: 'SHA-256'
    }, keyMaterial, {
        name: 'AES-GCM',
        length: 256
    }, false, ['encrypt', 'decrypt']);

    // Decrypt the private key
    const privateKey = await decryptData(key, encryptedPrivateKeyData.cipherText, new Uint8Array(encryptedPrivateKeyData.iv));

    return {
        privateKey,
        publicKey
    };
}

// Function to get or generate a key pair
async function getKeyPair(password) {
    // Try to retrieve the key pair
    let keyPair = await retrieveKeyPair(password);

    if (!keyPair) {
        // If no key pair found, generate a new one
        keyPair = generateKeyPair();

        // Store the key pair (encrypted private key) in localStorage
        await storeKeyPair(keyPair.privateKey, keyPair.publicKey, password);

        console.log("New key pair generated and stored:", keyPair);
    } else {
        console.log("Key pair retrieved from storage:", keyPair);
    }

    return keyPair;
}
