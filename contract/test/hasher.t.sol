pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {MerkleTree, IHasher} from "../src/MerkleTree.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract HaserTest is Test {
    address public hasherAddr = 0x1F2C6E90F3DF741E0191eAbB1170f0B9673F12b3; // mimc hasher
    MerkleTree tree;
    IHasher hasher;

    function setUp() public {
        hasher = IHasher(hasherAddr);
        tree = new MerkleTree(20, hasher);
    }

    function test_hasher() public {
        bytes32 leaf = keccak256("tornado");
        bytes32 root = bytes32(addmod(uint256(leaf), 0, tree.FIELD_SIZE()));

        // console.logBytes32(root);
        console.logString(
            concat3(
                "if (i == 0) return bytes32(",
                Strings.toHexString(uint256(root)),
                ");"
            )
        );
        for (uint32 i = 1; i < 32; i++) {
            root = tree.hashLeftRight(root, root);
            // console.logBytes32(root);
            console.logString(
                concat3(
                    concat3("else if (i ==", Strings.toString(i), ") return bytes32("),
                    Strings.toHexString(uint256(root)),
                    ");"
                )
            );
        }
    }
    function concat3(
        string memory a,
        string memory b,
        string memory c
    ) public pure returns (string memory) {
        return string.concat(string.concat(a, b), c);
    }
}
