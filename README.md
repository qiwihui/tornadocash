# Tornado Cash 代码实践

## verify code

```shell
forge verify-contract \
    --chain-id 11155111 \
    --num-of-optimizations 200 \
    --watch \
    --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint32)" 0x2158360b26162Ee5022f5579D5bB4C8c52405C7c 0x26def16Dd346c55c12f9f9A29e9E717bC64E11f5 100000000000000000 20) \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --compiler-version v0.8.26+commit.8a97fa7a \
    0x1Dc005f3D6aE614Cec7833c6e066c1cee96EfAB5 \
    src/tornaodo.sol:Tornado

forge verify-contract \
    --chain-id 11155111 \
    --num-of-optimizations 200 \
    --watch \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --compiler-version v0.8.26+commit.8a97fa7a \
    0x26def16Dd346c55c12f9f9A29e9E717bC64E11f5 \
    src/verifier.sol:Groth16Verifier
```
