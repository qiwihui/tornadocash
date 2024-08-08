pragma circom 2.1.9;

include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";


template CommitmentHasher() {
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    // Pedersen, circomlib
    // hash(nullifier+secret)
    // Pedersen, baby jupjup, 
    // 248 * 2 = 496
    component commitmentHasher = Pedersen(496);
    component nullifierHasher = Pedersen(248);
    component nullifierBits = Num2Bits(248);
    component secretBits = Num2Bits(248);
    nullifierBits.in <== nullifier;
    secretBits.in <== secret;

    for (var i = 0; i< 248; i++) {
        nullifierHasher.in[i] <== nullifierBits.out[i];
        commitmentHasher.in[i] <== nullifierBits.out[i]; // 0~247
        commitmentHasher.in[i+248] <== secretBits.out[i]; // 248~495
    }

    commitment <== commitmentHasher.out[0];
    nullifierHash <== nullifierHasher.out[0];

    // secret, nullifier => commitment, nullifierHash
    // check hash(secret, nullifier) === commitment
    // check nullifierHash = hash(nullifier)
}

// if s == 0, return [in[0], in[1]]
// if s == 1, return [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1]- in[0]) * s + in[0];
    out[1] <== (in[0]- in[1]) * s + in[1];
}


template hashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    // TODOL: MiMC
    component hasher = MiMCSponge(2, 220, 1);
    hasher.ins[0] <== left;
    hasher.ins[1] <== right;
    hasher.k <== 0;

    hash <== hasher.outs[0];
}

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i-1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = hashLeftRight(); // TODO
        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }
    root === hashers[levels - 1].hash;

	// leaf, root, pathElements[levels], pathIndices[levels]
	// check merkle tree: leaf, root, pathElements[levels], pathIndices[levels]
    // check root === merkletree()
}

template withdraw(levels) {
    // public
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    // private
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // commitmentHasher
    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;
    // check
    hasher.nullifierHash === nullifierHash;

    // MerkleTreeChecker
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // check recipient
    signal recipientSquare;
    recipientSquare <== recipient * recipient;

    // public input: root, nullifierHash
    // private: secret, nullifier, pathElements[levels], pathIndices[levels]

	// commitmentHasher
	// MerkleTreeChecker   
}

component main {public [root, nullifierHash, recipient]} = withdraw(20);
