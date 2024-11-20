const Web3 = require('web3');
const contractABI = require('./artifacts/ChatRoomManager.json');

let web3;
let chatContract;
let serviceAddress;

const setupWeb3 = async () => {
   if (typeof process !== 'undefined' && process.env.RPC_SERVER) {
        console.log(`[*] Connecting to provider: RPC ${process.env.RPC_SERVER}`);
        web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_SERVER));

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

        } else {
            throw new Error('Contract not deployed on the detected network.');
        }
    } else {
        throw new Error('No Ethereum provider found, and not in a server environment with RPC URL configured.');
    }
};

module.exports = { setupWeb3, web3, chatContract, serviceAddress };
