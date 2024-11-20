// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC725.sol";
import "./ERC735.sol";

contract Identity is ERC725, ERC735 {
    uint256 public constant ECDSA_KEY = 1;

    constructor(address _initialManagementKey) {
        // Initialize with a management key
        addKey(keccak256(abi.encodePacked(_initialManagementKey)), MANAGEMENT_KEY, ECDSA_KEY);
    }
}
