// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC725.sol";

//import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC735 {
    struct Claim {
        uint256 claimType;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    mapping(bytes32 => Claim) public claims;
    mapping(uint256 => bytes32[]) public claimsByType;

    event ClaimAdded(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer);
    event ClaimChanged(bytes32 indexed claimId, uint256 indexed claimType, address indexed issuer, bytes signature, bytes data, string uri);

    // Function to add a claim
    function addClaim(
        bytes32 _claimId,
        uint256 _claimType,
        address _issuer,
        bytes memory _signature,
        bytes memory _data,
        string memory _uri
    ) public returns (bool success) {
        Claim memory claim = Claim({
            claimType: _claimType,
            issuer: _issuer,
            signature: _signature,
            data: _data,
            uri: _uri
        });

        claims[_claimId] = claim;
        claimsByType[_claimType].push(_claimId);

        emit ClaimAdded(_claimId, _claimType, _issuer, _signature, _data, _uri);
        return true;
    }

    // Function to get a claim by its ID
    function getClaim(bytes32 _claimId) public view returns (
        uint256 claimType,
        address issuer,
        bytes memory signature,
        bytes memory data,
        string memory uri
    ) {
        Claim memory claim = claims[_claimId];
        return (
            claim.claimType,
            claim.issuer,
            claim.signature,
            claim.data,
            claim.uri
        );
    }

    // Function to get claims by type
    function getClaimsByType(uint256 _claimType) public view returns (bytes32[] memory _claimIds) {
        return claimsByType[_claimType];
    }

    // Function to remove a claim
    function removeClaim(bytes32 _claimId) public returns (bool success) {
        Claim memory claim = claims[_claimId];
        require(claim.claimType != 0, "Claim does not exist");

        // Remove claim from claimsByType
        bytes32[] storage typeClaims = claimsByType[claim.claimType];
        uint256 claimIndex = findClaimIndex(typeClaims, _claimId);
        typeClaims[claimIndex] = typeClaims[typeClaims.length - 1];
        typeClaims.pop();

        delete claims[_claimId];

        emit ClaimRemoved(_claimId, claim.claimType, claim.issuer);
        return true;
    }

    // Helper function to find claim index
    function findClaimIndex(bytes32[] storage claimIds, bytes32 claimId) internal view returns (uint256) {
        for (uint256 i = 0; i < claimIds.length; i++) {
            if (claimIds[i] == claimId) {
                return i;
            }
        }
        revert("Claim ID not found");
    }
}
