- Download foundry https://github.com/foundry-rs/foundry/releases
- Add foundry to path
- pnpm install --registry=https://mirrors.cloud.tencent.com/npm/
- pnpm install -g snarkjs --registry=https://mirrors.cloud.tencent.com/npm/
- Download circom and compile install https://github.com/iden3/circom for MacOS intel chip
- yarn build:circuits
- cp verifier.sol to the right location.
- Modify the file menu of withdraw_zk
- anvil --rpc-url https://eth.llamarpc.com --chain-id 31337
- yarn build:contracts
- yarn build:hasher
- Copy the hasher address to tornardo.s.sol

# FAQ

- Cannot read property 'toHexString' of undefined
这个问题是由于没有设置.env里面的PRIVATE_KEY导致的，需要设置一下。并不是什么版本依赖之类的问题。所以pnpm或者yarn都挺好使的。
- TornadoCash.js文件里面wasmFile和zkeyFile的路径不能用绝对路径，得用原来代码的相对路径，不然就报错。
- 