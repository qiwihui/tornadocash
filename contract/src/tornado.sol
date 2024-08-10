// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {MerkleTree, IHasher} from "./MerkleTree.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external returns (bool);
}

contract Tornado is MerkleTree, ReentrancyGuard {
    IVerifier public immutable verifier;
    uint256 public denomination;
    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullilfierHashes;

    event Deposit(bytes32 commitment, uint32 leafIndex);
    event Withdraw(address _recipient, bytes32 _nullilfierHash);

    constructor(
        IHasher _hasher,
        IVerifier _verifier,
        uint256 _denomination,
        uint32 _merkleTreeHeight
    ) MerkleTree(_merkleTreeHeight, _hasher) {
        verifier = _verifier;
        denomination = _denomination;
    }

    function deposit(bytes32 commitment) external payable nonReentrant {
        require(commitments[commitment], "The commitment has been added");
        require(msg.value == denomination, "Error denomination");

        uint32 leafIndex = insert(commitment); // 2^20
        commitments[commitment] = true;
        emit Deposit(commitment, leafIndex);
    }

    function withdraw(
        bytes calldata _proof,
        bytes32 _root,
        bytes32 _nullilfierHash,
        address _recipient
    ) external nonReentrant {
        require(
            nullilfierHashes[_nullilfierHash],
            "The note has already been spent"
        );
        // check root exists in merkle tree
        require(isKnownRoot(_root), "Root not exists");
        uint256[8] memory p = abi.decode(_proof, (uint256[8]));

        require(
            verifier.verifyProof(
                [p[0], p[1]],
                [[p[2], p[3]], [p[4], p[5]]],
                [p[6], p[7]],
                [uint256(_root), uint256(_nullilfierHash), uint256(uint160(_recipient))]
            ),
            "Invalid withdraw proof"
        );
        nullilfierHashes[_nullilfierHash] = true;
        // send ETH to _recipient
        (bool success, ) = payable(_recipient).call{value: denomination}("");
        require(success, "pay failed");
        emit Withdraw(_recipient, _nullilfierHash);
    }
}
