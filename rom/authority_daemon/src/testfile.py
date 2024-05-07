from web3 import Web3
import json
test_instance: Web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
with open("src/deployed_addresses.json","r") as address_file:
            address_object: dict[str,str] = json.loads(address_file.read())
            actual_address  = test_instance.to_checksum_address(address_object["eBoto#EA_Account"])
            with open("src/EA_Account.json","r") as abi_file:
                actual_abi = json.loads(abi_file.read())
                contract= test_instance.eth.contract(address=actual_address,abi=actual_abi)
print(contract.functions.getCandidateData("Never",1).call()[1])