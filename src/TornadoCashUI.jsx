import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { deposit, withdraw } from "./TornadoCash";
import data from "./lib/abi/Tornado.json";
import { useEthersSigner } from "./ethers";
import BeatLoader from "react-spinners/BeatLoader";
import "./TornadoCashUI.css";

const AMOUNT = "1";
const CONTRACT_ADDRESS = "0xC54051689e0931FdCF3e708b665f521f7ab42Fb0";

const TornadoCashUI = () => {
  const [withdrawNote, setWithdrawNote] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [depositHash, setDepositHash] = useState("");
  const [withdrawHash, setWithdrawhash] = useState("");

  const [dloading, setDLoading] = useState(false);
  const [wloading, setWLoading] = useState(false);
  const signer = useEthersSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, data.abi, signer);

  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();

  useEffect(() => {
    setRecipientAddress(address);
  }, [isConnected]);

  return (
    <div className="tornado-ui">
      <h1 className="title">Tornado Cash UI</h1>

      {!isConnected ? (
        <div className="card">
          <ConnectKitButton theme="midnight" />
        </div>
      ) : (
        <div className="card">
          <p>Connected as: {address}</p>
          <button className="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}

      {isConnected && (
        <>
          <div className="card">
            <h2 className="section-title">Deposit {AMOUNT} ETH</h2>
            <button
              className="button"
              onClick={async () => {
                setDLoading(true);
                const { note, commitment } = await deposit();
                setWithdrawNote(note);
                const tx = await contract.deposit(commitment, {
                  value: ethers.utils.parseUnits(AMOUNT, "ether"),
                });
                setDepositHash(tx.hash);
                await tx.wait();
                setDLoading(false);
              }}
            >
              {dloading ? <BeatLoader size={10} color={"#fff"} /> : "Deposit"}
            </button>
          </div>

          <div className="card">
            <h2 className="section-title">Withdraw</h2>
            <input
              type="text"
              className="input"
              placeholder="Enter secret note"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Enter recipient address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
            <button
              className="button"
              onClick={async () => {
                setWLoading(true);
                const { proof, args } = await withdraw(
                  contract,
                  withdrawNote,
                  recipientAddress
                );
                const tx = await contract.withdraw(proof, ...args);
                setWithdrawhash(tx.hash);
                await tx.wait();
                setWLoading(false);
              }}
            >
              {wloading ? <BeatLoader size={10} color={"#fff"} /> : "Withdraw"}
            </button>
          </div>
          <div>
            <div className="status">
              {depositHash && <div>Deposit Hash: {depositHash}</div>}
            </div>
            <div className="status">
              {withdrawHash && <div>Withdraw Hash: {withdrawHash}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TornadoCashUI;
