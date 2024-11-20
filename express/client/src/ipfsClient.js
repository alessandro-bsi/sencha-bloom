import { create } from 'ipfs-http-client';

// Connect to local IPFS (or Infura if preferred)
const ipfs = create({ url: process.env.REACT_APP_IPFS_URL });

// Upload content to IPFS
async function uploadToIPFS(encryptedMessage) {
    try {
        const buffer = Buffer.from(JSON.stringify(encryptedMessage));  // Convert message to buffer
        const result = await ipfs.add(buffer);  // Upload to IPFS
        return result.path;  // Return the IPFS hash
    }catch (e) {
        console.log(e);
    }
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

export {uploadToIPFS, retrieveFromIPFS};
