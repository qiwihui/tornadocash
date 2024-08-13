import * as snarkjs from "snarkjs";
import { utils } from "ffjavascript";
import { buildBabyjub, buildPedersenHash } from "circomlibjs";
import merkleTree from "fixed-merkle-tree";

const MERKLE_TREE_HEIGHT = 20;
const wasmFile = "../circuits/build/withdraw_js/withdraw.wasm";
const zkeyFile = "../circuits/build/withdraw.zkey";

function generateRandomHexBytes(length = 32) {
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  return randomBytes;
}

const rbigint = (nbytes) => utils.leBuff2int(generateRandomHexBytes(nbytes));

const perdersenHash = async (data) => {
  const babyJup = await buildBabyjub();
  const perdersen = await buildPedersenHash();
  return babyJup.F.toObject(babyJup.unpackPoint(perdersen.hash(data))[0]);
};

const toHex = (number, length = 32) =>
  "0x" +
  (number instanceof Buffer
    ? number.toString("hex")
    : BigInt(number).toString(16)
  ).padStart(length * 2, "0");

// Deposit

async function createDepost(nullifier, secret) {
  // geneate commitment and nullifierhash
  let deposit = { nullifier, secret };
  deposit.preimage = Buffer.concat([
    utils.leInt2Buff(deposit.nullifier, 31),
    utils.leInt2Buff(deposit.secret, 31),
  ]);
  deposit.commitment = await perdersenHash(deposit.preimage);
  deposit.nullifierHash = await perdersenHash(
    utils.leInt2Buff(deposit.nullifier, 31)
  );
  return deposit;
}

export async function deposit() {
  let deposit = await createDepost(rbigint(31), rbigint(31));
  const note = `tornado-eth-1-1-${toHex(deposit.preimage, 62)}`;
  return { note, commitment: toHex(deposit.commitment) };
}

// Withdraw

async function parseNote(noteString) {
  const noteRegex =
    /tornado-eth-1-(?<chainId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
  const match = noteRegex.exec(noteString);

  const buf = Buffer.from(match.groups.note, "hex");
  const nullifier = utils.leBuff2int(buf.slice(0, 31));
  const secret = utils.leBuff2int(buf.slice(31, 62));
  return await createDepost(nullifier, secret);
}

async function generateMerkleProof(contract, deposit) {
  // get constract state
  const eventFilter = contract.filters.Deposit();
  let events = await contract.queryFilter(eventFilter, -100, "latest");
  // console.log(events);
  // create merkle tree
  const leaves = events
    .sort((a, b) => a.args.leafIndex - b.args.leafIndex)
    .map((e) => e.args.commitment);
  const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves);
  // generate path
  let depositEvent = events.find(
    (e) => e.args.commitment === toHex(deposit.commitment)
  );
  let leafIndex = depositEvent ? depositEvent.args.leafIndex : -1;

  if (leafIndex == -1) {
    alert("The deposit is not found in the tree");
  }

  const { pathElements, pathIndices } = tree.path(leafIndex);
  return { pathElements, pathIndices, root: tree.root() };
}

function toSolidityProof(proof) {
  const flatProof = utils.unstringifyBigInts([
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1],
  ]);
  const result = {
    proof: "0x" + flatProof.map((x) => toHex(x, 32).slice(2, 66)).join(""),
  };
  return result;
}

async function generateSnarkProof(contract, deposit, recipient) {
  // geneate merkle proof
  const { pathElements, pathIndices, root } = await generateMerkleProof(
    contract,
    deposit
  );
  // groth16
  const inputs = {
    // public signals
    root: root,
    nullifierHash: deposit.nullifierHash,
    recipient: BigInt(recipient),
    // private signals
    nullifier: deposit.nullifier,
    secret: deposit.secret,
    pathElements: pathElements,
    pathIndices: pathIndices,
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    wasmFile,
    zkeyFile
  );
  //   console.log(proof);
  const proofData = toSolidityProof(proof);
  const args = [
    toHex(inputs.root),
    toHex(inputs.nullifierHash),
    toHex(inputs.recipient, 20),
  ];
  return { proof: proofData.proof, args };
}

export async function withdraw(contract, note, recipient) {
  // parse note
  let deposit = await parseNote(note);
  // console.log(toHex(deposit.commitment));
  // generate proof
  const { proof, args } = await generateSnarkProof(
    contract,
    deposit,
    recipient
  );
  return { proof, args };
}
