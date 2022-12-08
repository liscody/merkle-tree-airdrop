// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MerkleAirDrop is Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    IERC20 public token;
    bytes32 public merkleRoot;
    uint256 public amount;

    mapping(address => bool) public claimed;

    error IsActive();
    error AlreadyClaimed();
    error NotInMerkle();

    constructor(bytes32 _merkleRoot, uint256 _amount) {
        merkleRoot = _merkleRoot;
        amount = _amount;
    }

    event Claim(address indexed to, uint256 amount);
    event UpdateRoot(bytes32 indexed newRoot);
    event UpdateToken(address indexed token);
    event UpdateAmount(uint256 indexed amount);

    function claim(bytes32[] calldata proof) external {
        if (claimed[msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));

        bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);
        if (!isValidLeaf) revert NotInMerkle();

        claimed[msg.sender] = true;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Claim(msg.sender, amount);
    }

    function setRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;

        emit UpdateRoot(merkleRoot);
    }

    function setToken(address newToken) external onlyOwner {
        token = IERC20(newToken);

        emit UpdateToken(newToken);
    }

    function setAmount(uint256 _newAmount) external onlyOwner {
        amount = _newAmount;

        emit UpdateAmount(amount);
    }
}
