from web3 import Web3

web3 = Web3()

web3.eth.account.enable_unaudited_hdwallet_features()
MNEMONIC = "test test test test test test test test test test test junk"

index = 1000
account = web3.eth.account.from_mnemonic(MNEMONIC, account_path=f"m/44'/60'/0'/0/{index}")

print(f"address: {account.address}")
print(f"private key: {account._private_key.hex()}")
