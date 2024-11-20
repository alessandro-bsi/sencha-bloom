// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC725 {
    uint256 public constant MANAGEMENT_KEY = 1;
    uint256 public constant ACTION_KEY = 2;
    uint256 public constant CLAIM_SIGNER_KEY = 3;
    uint256 public constant ENCRYPTION_KEY = 4;

    struct Key {
        uint256[] purposes;
        uint256 keyType;
        bytes32 key;
    }

    mapping(bytes32 => Key) public keys;
    mapping(uint256 => bytes32[]) public keysByPurpose;

    event KeyAdded(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType);

    // Check if a key exists and is of a specific type
    function keyHasPurpose(bytes32 key, uint256 purpose) public view returns (bool) {
        uint256[] memory keyPurposes = keys[key].purposes;  // Get the array of purposes for the key
        for (uint i = 0; i < keyPurposes.length; i++) {
            if (keyPurposes[i] == purpose) {
                return true;  // Return true if the purpose matches
            }
        }
        return false;  // Return false if no matching purpose is found
    }

    function keyCanSignClaim(bytes32 key) public view returns (bool) {
        return keyHasPurpose(key, ERC725.CLAIM_SIGNER_KEY);
    }

    function getKey(bytes32 _key) public view returns (uint256[] memory purposes, uint256 keyType, bytes32 key) {
        Key memory keyData = keys[_key];
        return (keyData.purposes, keyData.keyType, keyData.key);
    }

    function getKeyPurposes(bytes32 _key) public view returns (uint256[] memory purposes) {
        return keys[_key].purposes;
    }

    function getKeysByPurpose(uint256 _purpose) public view returns (bytes32[] memory _keys) {
        return keysByPurpose[_purpose];
    }

    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType) public returns (bool success) {
        if (keys[_key].key == 0) {
            keys[_key].key = _key;
            keys[_key].keyType = _keyType;
        }

        keys[_key].purposes.push(_purpose);
        keysByPurpose[_purpose].push(_key);

        emit KeyAdded(_key, _purpose, _keyType);
        return true;
    }

    function removeKey(bytes32 _key, uint256 _purpose) public returns (bool success) {
        require(keys[_key].key != 0, "Key does not exist");

        // Remove purpose from key
        uint256 purposeIndex = findPurposeIndex(keys[_key].purposes, _purpose);
        require(purposeIndex < keys[_key].purposes.length, "Purpose not found for key");

        keys[_key].purposes[purposeIndex] = keys[_key].purposes[keys[_key].purposes.length - 1];
        keys[_key].purposes.pop();

        // Remove key from keysByPurpose
        bytes32[] storage purposeKeys = keysByPurpose[_purpose];
        uint256 keyIndex = findKeyIndex(purposeKeys, _key);
        purposeKeys[keyIndex] = purposeKeys[purposeKeys.length - 1];
        purposeKeys.pop();

        emit KeyRemoved(_key, _purpose, keys[_key].keyType);
        return true;
    }

    function findPurposeIndex(uint256[] storage purposes, uint256 purpose) internal view returns (uint256) {
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == purpose) {
                return i;
            }
        }
        revert("Purpose not found");
    }

    function findKeyIndex(bytes32[] storage keyList, bytes32 key) internal view returns (uint256) {
        for (uint256 i = 0; i < keyList.length; i++) {
            if (keyList[i] == key) {
                return i;
            }
        }
        revert("Key not found");
    }

}
