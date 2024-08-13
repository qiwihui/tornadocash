require("dotenv").config();
const snarkjs = require("snarkjs");
const { ethers } = require("ethers");
const crypto = require("crypto");
const { utils } = require("ffjavascript");
const { buildBabyjub, buildPedersenHash } = require("circomlibjs");
const merkleTree = require("fixed-merkle-tree");
const assert = require("assert");

const RPC_URL = process.env.ETH_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = "0xC54051689e0931FdCF3e708b665f521f7ab42Fb0";
const MERKLE_TREE_HEIGHT = 20;
const wasmFile = __dirname + "/../circuits/build/withdraw_js/withdraw.wasm";
const zkeyFile = __dirname + "/../circuits/build/withdraw.zkey";

let contract, babyJup, perdersen, chainId;

const rbigint = (nbytes) => utils.leBuff2int(crypto.randomBytes(nbytes));

const perdersenHash = (data) =>
  babyJup.F.toObject(babyJup.unpackPoint(perdersen.hash(data))[0]);

const toHex = (number, length = 32) =>
  "0x" +
  (number instanceof Buffer
    ? number.toString("hex")
    : BigInt(number).toString(16)
  ).padStart(length * 2, "0");

// Deposit

function createDepost(nullifier, secret) {
  // geneate commitment and nullifierhash
  let deposit = { nullifier, secret };
  deposit.preimage = Buffer.concat([
    utils.leInt2Buff(deposit.nullifier, 31),
    utils.leInt2Buff(deposit.secret, 31),
  ]);
  deposit.commitment = perdersenHash(deposit.preimage);
  deposit.nullifierHash = perdersenHash(
    utils.leInt2Buff(deposit.nullifier, 31)
  );
  return deposit;
}

async function deposit() {
  let deposit = createDepost(rbigint(31), rbigint(31));
  // send tx
  const tx = await contract.deposit(toHex(deposit.commitment), {
    value: ethers.utils.parseUnits("1", "ether"),
  });

  await tx.wait();
  console.log(`tx hash ${tx.hash}`);
  const note = `tornado-eth-1-${chainId}-${toHex(deposit.preimage, 62)}`;
  return note;
}

// Withdraw

function parseNote(noteString) {
  const noteRegex =
    /tornado-eth-1-(?<chainId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
  const match = noteRegex.exec(noteString);

  const buf = Buffer.from(match.groups.note, "hex");
  const nullifier = utils.leBuff2int(buf.slice(0, 31));
  const secret = utils.leBuff2int(buf.slice(31, 62));
  return createDepost(nullifier, secret);
}

async function generateMerkleProof(deposit) {
  // get constract state
  const eventFilter = contract.filters.Deposit();
  let events = await contract.queryFilter(eventFilter, -100, "latest");
//   console.log(events);
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

  assert(leafIndex >= 0, "The deposit is not found in the tree");
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
  return result
}

async function generateSnarkProof(deposit, recipient) {
  // geneate merkle proof
  const { pathElements, pathIndices, root } = await generateMerkleProof(
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
  const proofData = toSolidityProof(proof)
  const args = [
    toHex(inputs.root),
    toHex(inputs.nullifierHash),
    toHex(inputs.recipient, 20)
  ]
  return {proof: proofData.proof, args}
}

async function withdraw(note, recipient) {
  // parse note
  let deposit = parseNote(note);
  console.log(toHex(deposit.commitment));
  // generate proof
  const {proof, args} = await generateSnarkProof(deposit, recipient);
  // send withdraw tx
  const tx = await contract.withdraw(proof, ...args);
  await tx.wait();
  console.log(`tx hash ${tx.hash}`)
}

async function main() {
  babyJup = await buildBabyjub();
  perdersen = await buildPedersenHash();
  // import signer
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  chainId = (await provider.getNetwork()).chainId;

  contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    require("../src/lib/abi/Tornado.json").abi,
    signer
  );
  // generate node and deposit
  const note = await deposit();
  console.log("deposit note", note);
  // withdraw using note
  await withdraw(note, signer.address);
  console.log("Done");
  process.exit();
}

main();
