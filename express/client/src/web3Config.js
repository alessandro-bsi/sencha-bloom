import Web3 from 'web3';
import contractABI from "./artifacts/ChatRoomManager.json";

let web3;
let chatContract;
let userAddress;

const setupWeb3 = async () => {
    // Check if the code is running in a browser with MetaMask installed
    if (typeof window !== 'undefined' && window.ethereum) {
        web3 = new Web3(window.ethereum);
        const networkId = await web3.eth.net.getId();
        const networkData = contractABI.networks[networkId];
        const index = 0;

        if (networkData) {
            chatContract = new web3.eth.Contract(contractABI.abi, networkData.address);

            const accounts = await web3.eth.getAccounts();
            if (accounts.length > index) {
                userAddress = accounts[index];
                console.log(`Current User address: ${userAddress}`);
            } else {
                throw new Error(`User not found`);
            }
        } else {
            throw new Error('Contract not deployed on the detected network.');
        }
    }
    // For Node.js environment (server-side)
    else if (typeof process !== 'undefined' && process.env.REACT_APP_RPC_SERVER) {
        web3 = new Web3(new Web3.providers.HttpProvider(process.env.REACT_APP_RPC_SERVER));

        // Use the deployed address for the contract from the ABI file and network data
        const networkId = await web3.eth.net.getId();
        const networkData = contractABI.networks[networkId];
        const index = 0;

        if (networkData) {
            chatContract = new web3.eth.Contract(contractABI.abi, networkData.address);

            const accounts = await web3.eth.getAccounts();
            if (accounts.length > index) {
                userAddress = accounts[index];
                console.log(`Current User address: ${userAddress}`);
            } else {
                throw new Error(`User not found`);
            }

        } else {
            throw new Error('Contract not deployed on the detected network.');
        }
    } else {
        throw new Error('No Ethereum provider found, and not in a server environment with RPC URL configured.');
    }
};

export { setupWeb3, web3, chatContract, userAddress };
