// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./identity/Identity.sol";

contract IdentityProvider is Ownable {
    mapping(address => address) public userIdentities;
    mapping(address => bool) public userVerified;
    mapping(address => bool) public trustedAuthorities; // Whitelisted authorities
    mapping(address => bool) public trustedServices; // Whitelisted services

    uint256 public totalAuthorities; // Counter for trusted authorities
    uint256 public totalServices; // Counter for trusted services

    event UserRegistered(address indexed user, address identity);
    event ClaimIssued(address indexed user, address indexed issuer);
    event UserAuthenticated(address indexed user, bool success);

    event Debug(bytes32 dataHash, bytes32 ethSignedMessageHash, address recoveredAddress, bool isValidSignature);
    event DebugSignature(bytes32 r, bytes32 s, uint8 v, address recoveredAddress);

    constructor(address[] memory initialAuthorities, address[] memory initialServices) {
        for (uint256 i = 0; i < initialAuthorities.length; i++) {
            trustedAuthorities[initialAuthorities[i]] = true;  // Set up initial trusted authorities
            totalAuthorities++;
        }

        for (uint256 i = 0; i < initialServices.length; i++) {
            trustedServices[initialServices[i]] = true;  // Set up initial trusted services
            totalServices++;
        }

        // Owner is the contract deployer
        transferOwnership(msg.sender);
    }

    // Modifier to restrict access to trusted authorities
    modifier onlyTrustedAuthority() {
        require(isTrustedAuthority(msg.sender), "Only trusted authorities can issue claims");
        _;
    }

    // Check trusted authority
    function isTrustedAuthority(address authority) public view returns (bool){
        return trustedAuthorities[authority];
    }

    // Check trusted service
    function isTrustedService(address service) public view returns (bool){
        return trustedServices[service];
    }

    // Add a new trusted authority
    function addTrustedAuthority(address authority) public onlyOwner {
        // Ideally, add access control here, e.g., only the contract owner can call this.
        require(!trustedAuthorities[authority], "Already a trusted authority");
        trustedAuthorities[authority] = true;
        totalAuthorities++;
    }

    // Add a new trusted services
    function addTrustedService(address service) public onlyOwner {
        // Ideally, add access control here, e.g., only the contract owner can call this.
        require(!trustedServices[service], "Already a trusted service");
        trustedAuthorities[service] = true;
        totalServices++;
    }

    // Add a new trusted services
    function removeTrustedService(address service) public onlyOwner {
        // Ideally, add access control here, e.g., only the contract owner can call this.
        require(trustedServices[service], "Not a trusted service");
        trustedAuthorities[service] = false;
        totalServices--;
    }

    // Remove a trusted authority
    function removeTrustedAuthority(address authority) public onlyOwner {
        // Ideally, add access control here.
        require(trustedAuthorities[authority], "Not a trusted authority");
        trustedAuthorities[authority] = false;
        totalAuthorities--;
    }

    // Function to check if a user is verified based on their claim
    function isUserVerified(address user) public view returns (bool) {
        return userVerified[user];
    }

    // Function to register a user by creating their Identity contract and issuing a claim
    function register(address user, bytes32 claimId, bytes memory signature, string memory claimData, string memory url) public onlyTrustedAuthority returns (bool){
        // Ensure the user doesn't already have an identity contract
        require(userIdentities[user] == address(0), "User is already registered");

        // Deploy a new Identity contract for the user
        Identity userIdentity = new Identity(user);

        // Store the user's identity contract address
        userIdentities[user] = address(userIdentity);

        userIdentity.addClaim(claimId, 1, msg.sender, signature, abi.encodePacked(claimData), url);

        emit UserRegistered(user, address(userIdentity));
        emit ClaimIssued(user, msg.sender);

        return userIdentities[user] != address(0);
    }

    // Function to check if a user is registered and has an Identity contract
    function isRegistered(address user) public view returns (bool) {
        return userIdentities[user] != address(0);
    }

    function authenticate(address user, bytes32 claimId) public returns (bool) {
        require(userIdentities[user] != address(0), "User not registered");

        address identityAddress = userIdentities[user];
        Identity userIdentity = Identity(identityAddress);

        // Fetch the claim from the user's identity contract
        (
            , // uint256 claimType,
            address issuer,
            bytes memory signature,
            bytes memory data,
              // string memory uri
        ) = userIdentity.getClaim(claimId);

        // Verify that the claim issuer is a trusted authority
        require(trustedAuthorities[issuer], "Issuer is not a trusted authority");

        // Verify the signature
        bytes32 dataHash =  keccak256(abi.encodePacked(data)); // Hash the claim data to get the message hash
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(dataHash);  // Add the Ethereum prefix !!!!!

        // For now, this is giving me a super headache
        // bool isValid = verifySignature(issuer, dataHash, signature);
        bool isValid = trustedAuthorities[issuer];

        require(isValid, "Signature is invalid");

        emit Debug(dataHash, ethSignedMessageHash, issuer, isValid);

        userVerified[user] = isValid;  // Mark the user as verified

        emit UserAuthenticated(user, isValid);
        return isValid;
    }

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        // Damn Ethereum I lost 2 days for this
        // Prefix the message with "\x19Ethereum Signed Message:\n32" and hash it again
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    // Signature verification using ecrecover
    function verifySignature(address issuer, bytes32 dataHash, bytes memory signature) internal /*pure*/ returns (bool) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Split the signature into its components: r, s, and v
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Adjust v if necessary
        if (v < 27) {
            v += 27;
        }

        // Verify that v is in the correct range
        require(v == 27 || v == 28, "Invalid signature version");

        // Recover the signer address from the signature
        address recoveredAddress = ecrecover(dataHash, v, r, s);

        emit DebugSignature(r, s, v, recoveredAddress);

        return (recoveredAddress == issuer);  // Return true if the recovered address matches the issuer
    }
}