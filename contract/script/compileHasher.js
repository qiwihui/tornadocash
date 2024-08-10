require("dotenv/config");
const { mimcSpongecontract } = require("circomlibjs");
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_RPC_URL
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(JSON.stringify(mimcSpongecontract.abi))
  const MiMCSponge = new ethers.ContractFactory(
    mimcSpongecontract.abi,
    mimcSpongecontract.createCode("mimcsponge", 220),
    signer
  );
  let mimcsponge = await MiMCSponge.deploy();
  console.log(mimcsponge.address);
}

main();
