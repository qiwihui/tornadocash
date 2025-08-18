pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {Groth16Verifier} from "../src/verifier.sol";
import {Tornado, IHasher, IVerifier} from "../src/tornado.sol";

contract TornadoScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hasher = 0x2158360b26162Ee5022f5579D5bB4C8c52405C7c;

        vm.startBroadcast(deployerPrivateKey);
        // deploy contract
        Groth16Verifier pv = new Groth16Verifier();
        new Tornado(
            IHasher(hasher),
            IVerifier(address(pv)),
            0.1 ether,
            uint32(20)
        );
        vm.stopBroadcast();
    }
}
