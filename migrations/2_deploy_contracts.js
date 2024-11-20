const IdentityProvider = artifacts.require("IdentityProvider.sol");
const ChatRoomManager = artifacts.require("ChatRoomManager");
const Identity = artifacts.require("Identity");
const ERC735 = artifacts.require("ERC735");
const ERC725 = artifacts.require("ERC725");

module.exports = async function(deployer, network, accounts) {
    const owner = accounts[0];  // Use the deployer as the initial management key
    const trustedAuthorities = [
        accounts[1],
        accounts[2],
        accounts[3]
    ];

    const trustedServices = [
        accounts[4],
        accounts[5]
    ];

    // Step 1: Deploy Identity Contracts
    await deployer.deploy(ERC725);
    const erc725 = await ERC725.deployed();

    await deployer.deploy(ERC735);
    const erc735 = await ERC735.deployed();

    await deployer.deploy(Identity, owner);
    const identity = await Identity.deployed();

    // Step 2: Deploy IDP
    await deployer.deploy(IdentityProvider, trustedAuthorities, trustedServices);
    const idp = await IdentityProvider.deployed();

    // Step 3: Deploy Chat-related contracts
    await deployer.deploy(ChatRoomManager, idp.address);
    const chatRoomManager = await ChatRoomManager.deployed();


    // Optional: Deploy Identity contract (users have individual identities on-chain)

    console.log("Contracts deployed successfully:");
    console.log("ERC725 Contract Address:", erc725.address);
    console.log("ERC735 Contract Address:", erc735.address);
    console.log("Identity Contract Address:", identity.address);
    console.log("IdentityProvider Address:", idp.address);
    console.log("ChatRoomManager Contract Address:", chatRoomManager.address);

    console.log("Owner Address:", owner);
    console.log("Trusted Authority Address 1:", trustedAuthorities[0]);
    console.log("Trusted Authority Address 2:", trustedAuthorities[1]);
    console.log("Trusted Authority Address 3:", trustedAuthorities[2]);
    console.log("Trusted Authority 1 is really trusted?", await chatRoomManager.isTrustedEntity({from: trustedAuthorities[0]}));
    console.log("Trusted Authority 2 is really trusted?", await chatRoomManager.isTrustedEntity({from: trustedAuthorities[1]}));
    console.log("Trusted Authority 3 is really trusted?", await chatRoomManager.isTrustedEntity({from: trustedAuthorities[2]}));

    console.log("Trusted Service Address 1:", trustedServices[0]);
    console.log("Trusted Service Address 2:", trustedServices[1]);
    console.log("Trusted Service 1 is really trusted?", await chatRoomManager.isTrustedEntity({from: trustedServices[0]}));
    console.log("Trusted Service 2 is really trusted?", await chatRoomManager.isTrustedEntity({from: trustedServices[1]}));

};
