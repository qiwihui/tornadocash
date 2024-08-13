pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {Groth16Verifier} from "../src/verifier.sol";
import {Tornado, IHasher, IVerifier} from "../src/tornado.sol";

contract TornadoScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hasher = 0x9bDD64340D3CE0607f51bBC7508CA40D45849ab8;

        vm.startBroadcast(deployerPrivateKey);
        // deploy contract
        Groth16Verifier pv = new Groth16Verifier();
        new Tornado(
            IHasher(hasher),
            IVerifier(address(pv)),
            1 ether,
            uint32(20)
        );
        vm.stopBroadcast();
    }
}
