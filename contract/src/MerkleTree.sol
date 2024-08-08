// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;


contract MerkleTree {
	uint32 public levels;
	constructor(uint32 _levels) {
		levels = _levels;
	}
	function insert(bytes32 leaf) public returns (uint32){
		// TODO
		return 0;
	}
	function hash(bytes32 left, bytes32 right) public {}
	function isKnownRoot(bytes32 root) public returns(bool){
		return false;
	}
}
