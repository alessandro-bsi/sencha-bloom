// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IdentityProvider.sol";

contract ChatRoomManager {
    IdentityProvider public idp;

    struct JoinRequest {
        address applicant;
        uint votes;
        mapping(address => bool) voted;
        bool isActive;
        bytes eccPublicKey;
    }

    struct Message {
        address sender;
        string messageHash;
    }

    struct ChatRoom {
        string name;
        string description;
        bool isPrivate;
        address[] members;
        mapping(address => bool) isMember;
        Message[] messages; // Array of messages with sender info
        mapping(address => JoinRequest) joinRequests;
        address[] joinRequestList;
        mapping(address => bytes) eccPublicKeys;
    }

    struct ChatRoomInfo {
        string name;
        string description;
        bool isPrivate;
        address[] members;
        Message[] messageHashes;
    }

    mapping(address => string) public nicknames;
    mapping(uint => ChatRoom) public chatRooms;
    uint public chatRoomCount;

    event RoomCreated(uint roomId, string name, string description, address creator);
    event UserAdded(uint roomId, address user);
    event KeyAdded(uint roomId, address user, bytes eccKey);
    event MessageSent(uint roomId, address sender, string messageHash);
    event JoinRequestSubmitted(uint roomId, address applicant);
    event JoinRequestVoted(uint roomId, address voter, address applicant);
    event JoinRequestApproved(uint roomId, address applicant);
    event UserHasNoECCKey(address user);

    constructor(address idpAddress) {
        idp = IdentityProvider(idpAddress);
    }

    modifier onlyVerifiedUser() {
        require(isVerified(msg.sender), "User not verified");
        _;
    }

    modifier onlyVerifiedUserOrService() {
        require(
            (idp.isUserVerified(msg.sender) || idp.isTrustedService(msg.sender)),
            "User or service not verified"
        );
        _;
    }

    modifier onlyTrustedEntity(){
        require(
            (idp.isTrustedAuthority(msg.sender) || idp.isTrustedService(msg.sender)),
            "Entity not trusted"
        );
        _;
    }

    function isTrustedEntity() public view returns (bool) {
        return (idp.isTrustedAuthority(msg.sender) || idp.isTrustedService(msg.sender));
    }

    function isRegistered(address userAddress) public view returns (bool) {
         return idp.isRegistered(userAddress);
    }

    function isVerified(address userAddress) public view returns (bool) {
         return idp.isUserVerified(userAddress);
    }

    function register(address user, bytes32 claimId, bytes memory signature, string memory claimData, string memory url) public onlyTrustedEntity returns (bool) {
        (bool success, bytes memory returndata) = address(idp).delegatecall(
                abi.encodeWithSelector(
                    IdentityProvider.register.selector,
                    user, claimId, signature, claimData, url
                )
            );
         require(success, "Error registering user");
         return idp.authenticate(user, claimId);
    }

    function isMemberOf(uint roomId) public view onlyVerifiedUserOrService returns (bool) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        return room.isMember[msg.sender];
    }

    function isRoomPrivate(uint roomId) public view onlyVerifiedUserOrService returns (bool) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        return room.isPrivate;
    }

    function userIsMemberOf(address user, uint roomId) public view onlyTrustedEntity returns (bool) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        return room.isMember[user];
    }

    function hasRequestedToJoin(uint roomId) public view onlyVerifiedUser returns (bool) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        return room.joinRequests[msg.sender].isActive;
    }

    function setNickname(string memory _nickname) public onlyVerifiedUser {
        nicknames[msg.sender] = _nickname;
    }

    function getNickname(address _user) public view onlyVerifiedUser returns (string memory) {
        return nicknames[_user];
    }

    function createPublicRoom(string memory name, string memory description) public onlyVerifiedUser returns (uint) {
        bytes memory ownerPublicKey = new bytes(0);
        bool isPrivate = false;
        return _createRoom(name, description, isPrivate, ownerPublicKey);

    }

    function createPrivateRoom(string memory name, string memory description, bytes memory ownerPublicKey) public onlyVerifiedUser returns (uint) {
        require(ownerPublicKey.length == 33, "Invalid ECC public key format");
        bool isPrivate = true;
        return _createRoom(name, description, isPrivate, ownerPublicKey);
    }

    function _createRoom(string memory name, string memory description, bool isPrivate, bytes memory ownerPublicKey) internal onlyVerifiedUser returns (uint) {
        chatRoomCount++;
        ChatRoom storage newChatRoom = chatRooms[chatRoomCount];
        newChatRoom.name = name;
        newChatRoom.description = description;
        newChatRoom.isPrivate = isPrivate;

        // Add creator as first member
        newChatRoom.members.push(msg.sender);
        newChatRoom.isMember[msg.sender] = true;

        newChatRoom.eccPublicKeys[msg.sender] = ownerPublicKey;

        emit RoomCreated(chatRoomCount, name, description, msg.sender);
        emit UserAdded(chatRoomCount, msg.sender);
        emit KeyAdded(chatRoomCount, msg.sender, ownerPublicKey);

        return chatRoomCount;
    }

    function getRoomCount() public view returns (uint256) {
        return chatRoomCount;
    }

    function getRooms() public view /*onlyVerifiedUser*/ returns (ChatRoomInfo[] memory) {
        ChatRoomInfo[] memory roomInfos = new ChatRoomInfo[](chatRoomCount);

        for (uint i = 1; i <= chatRoomCount; i++) {
            ChatRoom storage room = chatRooms[i];
            roomInfos[i] = ChatRoomInfo({
                name: room.name,
                description: room.description,
                isPrivate: room.isPrivate,
                members: room.members,
                messageHashes: room.messages
            });
        }

        return roomInfos;
    }

    function getRoomMembers(uint roomId) public view onlyVerifiedUser returns (address[] memory) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        return room.members;
    }

    // New function to set or replace the ECC key for a user in a room
    function setRoomMemberECCPublicKey(uint roomId, bytes memory eccPublicKey) public onlyVerifiedUser {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        require(room.isMember[msg.sender], "Not a member of this room");
        require(eccPublicKey.length == 33, "Invalid ECC public key format");  // For compressed ECC keys

        room.eccPublicKeys[msg.sender] = eccPublicKey;
    }

    // New function to retrieve ECC public keys of room members (excluding those without keys)
    function getRoomMemberPublicKeys(uint roomId) public view onlyVerifiedUserOrService returns (bytes[] memory) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        require(room.isMember[msg.sender], "Only members can access this");

        uint memberCount = room.members.length;
        bytes[] memory tempPublicKeys = new bytes[](memberCount);
        uint validKeyCount = 0;

        for (uint i = 0; i < memberCount; i++) {
            address member = room.members[i];
            bytes memory publicKey = room.eccPublicKeys[member];
            if (publicKey.length != 0) {
                tempPublicKeys[validKeyCount] = publicKey;
                validKeyCount++;
            }
        }

        bytes[] memory publicKeys = new bytes[](validKeyCount);
        for (uint j = 0; j < validKeyCount; j++) {
            publicKeys[j] = tempPublicKeys[j];
        }

        return publicKeys;
    }

    // New function to retrieve ECC public keys of room members (excluding those without keys)
    function getRoomMemberPublicKey(address member, uint roomId) public view onlyVerifiedUserOrService returns (bytes memory) {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        require(room.isMember[msg.sender], "Only members can access this");

        return room.eccPublicKeys[member];
    }

    function requestAccessToRoom(uint roomId, bytes memory eccPublicKey) public onlyVerifiedUser {
        require((0 < roomId) && (roomId <= chatRoomCount), "Room doesn't exist");
        ChatRoom storage room = chatRooms[roomId];
        if(room.isPrivate){
            return requestJoinPrivateChatRoom(roomId, eccPublicKey);
        } else {
            return joinChatRoom(roomId);
        }
    }

    function joinChatRoom(uint roomId) public onlyVerifiedUser {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(!chatRoom.isPrivate, "Private room. Use requestJoinPrivateChatRoom instead");
        chatRoom.members.push(msg.sender);
        chatRoom.isMember[msg.sender] = true;
    }

    function requestJoinPrivateChatRoom(uint roomId, bytes memory eccPublicKey) public onlyVerifiedUser {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(chatRoom.isPrivate, "Not a private room");
        require(!chatRoom.joinRequests[msg.sender].isActive, "Already have an active join request");
        require(eccPublicKey.length == 33, "Invalid ECC public key format");  // For compressed ECC keys

        JoinRequest storage newRequest = chatRoom.joinRequests[msg.sender];
        newRequest.applicant = msg.sender;
        newRequest.votes = 0;
        newRequest.isActive = true;
        newRequest.eccPublicKey = eccPublicKey;
        chatRoom.joinRequestList.push(msg.sender);

        emit JoinRequestSubmitted(roomId, msg.sender);
    }

    function voteJoinRequest(uint roomId, address applicant) public onlyVerifiedUser {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(chatRoom.isPrivate, "Not a private room");
        require(chatRoom.isMember[msg.sender], "Only members can vote");
        JoinRequest storage joinRequest = chatRoom.joinRequests[applicant];
        require(joinRequest.isActive, "No active join request");
        require(!joinRequest.voted[msg.sender], "User already voted");

        joinRequest.voted[msg.sender] = true;
        joinRequest.votes++;

        emit JoinRequestVoted(roomId, msg.sender, applicant);

        if (joinRequest.votes > chatRoom.members.length / 2) {
            chatRoom.members.push(applicant);
            chatRoom.isMember[applicant] = true;
            chatRoom.eccPublicKeys[applicant] = joinRequest.eccPublicKey;
            joinRequest.isActive = false;
            emit JoinRequestApproved(roomId, applicant);
        }
    }

    function getJoinRequests(uint roomId) public view onlyVerifiedUser returns (address[] memory) {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(chatRoom.isPrivate, "Not a private room");
        require(chatRoom.isMember[msg.sender], "Only members can view join requests");

        uint activeCount = 0;
        for (uint i = 0; i < chatRoom.joinRequestList.length; i++) {
            if (chatRoom.joinRequests[chatRoom.joinRequestList[i]].isActive) {
                activeCount++;
            }
        }

        address[] memory activeRequests = new address[](activeCount);
        uint index = 0;
        for (uint i = 0; i < chatRoom.joinRequestList.length; i++) {
            address applicant = chatRoom.joinRequestList[i];
            if (chatRoom.joinRequests[applicant].isActive) {
                activeRequests[index++] = applicant;
            }
        }

        return activeRequests;
    }

    function sendMessage(uint roomId, string memory messageHash) public onlyVerifiedUser {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(!chatRoom.isPrivate || chatRoom.isMember[msg.sender], "Not a member of this private room");
        require(!chatRoom.isPrivate || chatRoom.eccPublicKeys[msg.sender].length != 0, "Any member should register an ECC key pair to send messages");
        chatRoom.messages.push(Message({
            sender: msg.sender,
            messageHash: messageHash
        }));
        emit MessageSent(roomId, msg.sender, messageHash);
    }

    function getMessages(uint roomId) public view onlyVerifiedUser returns (Message[] memory) {
        ChatRoom storage chatRoom = chatRooms[roomId];
        require(!chatRoom.isPrivate || chatRoom.isMember[msg.sender], "Not a member of this private room");
        return chatRoom.messages;
    }
}
