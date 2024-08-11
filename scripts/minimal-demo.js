require("dotenv").config();
const { ethers } = require("ethers");
const crypto = require("crypto");
const { utils } = require("ffjavascript");
const { buildBabyjub, buildPedersenHash } = require("circomlibjs");

const RPC_URL = process.env.ETH_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = "0xD962a5F050A5F0a2f8dF82aFc04CF1afFE585082";

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

function createDepost() {
  // geneate commitment and nullifierhash
  let deposit = {
    nullifier: rbigint(31),
    secret: rbigint(31),
  };
  deposit.preimage = Buffer.concat([
    utils.leInt2Buff(deposit.nullifier, 31),
    utils.leInt2Buff(deposit.secret, 31)
  ]);
  deposit.commitment = perdersenHash(deposit.preimage);
  deposit.nullifierHash = perdersenHash(utils.leInt2Buff(deposit.nullifier, 31));
  console.log(deposit);
  return deposit
}

async function deposit() {
  let deposit = createDepost();
  // send tx
  const tx = await contract.deposit(toHex(deposit.commitment), {
    value: ethers.utils.parseUnits("1", "ether"),
  });

  await tx.wait();
  console.log(`tx hash ${tx.hash}`);
  const note = `tornado-eth-1-${chainId}-${toHex(deposit.preimage, 62)}`;
  return note;
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
}

main();
