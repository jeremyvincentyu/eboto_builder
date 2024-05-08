#Made with reference to https://leftasexercise.com/2021/08/25/compiling-and-deploying-a-smart-contract-with-geth-and-python/
#Assume starting directory is eboto_runtime
import json
from web3 import Web3
from web3.middleware.geth_poa import geth_poa_middleware
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from eth_account import Account

#Import the dispenser account
with open("poa/dispenser.json","r") as dispenser_file:
    dispenser_info = dispenser_file.read()
    dispenser_data = json.loads(dispenser_info)
    private_key = dispenser_data["privateKey"]
    address = dispenser_data["address"]
    public_key = dispenser_data["publicKey"]



#Create a web3 context
web3_instance: Web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
authority_account = Account.from_key(private_key)
web3_instance.eth.default_account = address
web3_instance.middleware_onion.inject(geth_poa_middleware, layer = 0)
web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=authority_account))


#Import the ABI and Bytecode
with open("poa/build/src_EA_Account_sol_EA_Account.abi","r") as abi_file:
    abi_string = abi_file.read()
    abi = json.loads(abi_string)

with open("poa/build/src_EA_Account_sol_EA_Account.bin","r") as bytecode_file:
    bytecode = bytecode_file.read()

#Make the contract
temporary = web3_instance.eth.contract(bytecode=bytecode, abi=abi)
initialization = temporary.constructor(address,public_key).build_transaction({"from": address,"gasPrice":0})

#Deploy the contract
txn_hash = web3_instance.eth.send_transaction(initialization)
txn_receipt = web3_instance.eth.wait_for_transaction_receipt(txn_hash)
contract_address = txn_receipt["contractAddress"]
print(f"Contract was deployed to {contract_address}")

contract_address_dict = { "eBoto#EA_Account": contract_address}
contract_json = json.dumps(contract_address_dict)

#Write the contract address down locally
with open("poa/deployed_addresses.json","w") as deployment_file:
    deployment_file.write(contract_json)

#Write down the ABI locally
with open("poa/abi.json","w") as abi_file:
    abi_file.write(abi_string)

#Write down the ABI into the frontend
with open("eboto_frontend/src/EA_Account.json","w") as abi_file:
    abi_file.write(abi_string)

#Write the contract address into the frontend
with open("eboto_frontend/src/deployed_addresses.json","w") as deployment_file:
    deployment_file.write(contract_json)

#Write down the ABI into the authority daemon
with open("authority_daemon/src/EA_Account.json","w") as abi_file:
    abi_file.write(abi_string)

#Write Down the ABI into the isolator
with open("isolator/src/EA_Account.json","w") as abi_file:
    abi_file.write(abi_string)

#Write the contract address into the isolator
with open("isolator/src/deployed_addresses.json","w") as deployment_file:
    deployment_file.write(contract_json)

#Write the contract address into the authority daemon
with open("authority_daemon/src/deployed_addresses.json","w") as deployment_file:
    deployment_file.write(contract_json)

#Write the Authority Private Key into the Authority Daemon
with open("authority_daemon/data/authority.json","w") as authority_file:
    key_dict = {"private": private_key}
    key_json = json.dumps(key_dict)
    authority_file.write(key_json)

#Write the Authority Public Key into the Isolator
with open("isolator/data/ea_pubkey.json","w") as pubkey_file:
    pubkey_dict = {"public": public_key}
    pubkey_json = json.dumps(pubkey_dict)
    pubkey_file.write(pubkey_json)


#Write the Authority Private Key into the Testing Data Folder
with open("testing/data/authority.json","w") as authority_file:
    authority_file.write(key_json)

#Write the ABI into the Testing Data Folder
with open("testing/data/abi.json","w") as abi_file:
    abi_file.write(abi_string)

#Write the Contract Address into the Testing Data Folder
with open("testing/data/deployed_addresses.json","w") as deployment_file:
    deployment_file.write(contract_json)
