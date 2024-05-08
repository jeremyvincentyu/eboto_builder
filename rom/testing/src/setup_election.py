#Import the web3 context
from web3 import Web3
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from web3.contract.contract import Contract
from web3.types import TxParams,Wei
from eth_account import Account
from time import sleep
#For interacting with the authority daemon
import requests

#For reading the key file
import json

#For Salting
from secrets import randbits

#Import wrapped eth-crypto libraries for keypair generation
from eth_crypto import generate_keypair, encrypt, private2public, decrypt

#For taking command-line parameters
from sys import argv

#Read the authority's private key
with open("data/authority.json","r") as authority_file:
    key_string = authority_file.read()
    key_dict = json.loads(key_string)
    authority_key = key_dict["private"]
    authority_pubkey = private2public(authority_key)

#Start by Setting Up a Web3 Context, complete with authority account and signer
rpc_address = "http://127.0.0.1:8545"
web3_instance = Web3(Web3.HTTPProvider(rpc_address))



authority_account = Account.from_key(authority_key)
authority_address = authority_account.address
web3_instance.middleware_onion.inject(geth_poa_middleware,layer=0)
web3_instance.eth.default_account = authority_address
web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=authority_account))

#Load the contract
#First the Address
with open("data/deployed_addresses.json","r") as address_file:
    address_string = address_file.read()
    address_object = json.loads(address_string)
    actual_address  = web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])

#Then the ABI
with open("data/abi.json","r") as abi_file:
    abi_string = abi_file.read()
    actual_abi = json.loads(abi_string)

contract: Contract= web3_instance.eth.contract(address=actual_address,abi=actual_abi)

#Create n voters, where n is a number from argv
enrolled_voters = int(argv[1])

#Clear all old keys
from os import mkdir
election_name = argv[2]
mkdir(f"data/private_keys/{election_name}")

all_voters: list[tuple[str,str]] = []

for voter_serial in range(enrolled_voters):
    #Generate Keypair
    new_voter_parameters = json.loads(generate_keypair())

    #Extract Parameters
    private_key = new_voter_parameters["privateKey"]
    public_key = new_voter_parameters["publicKey"]
    ethereum_address = new_voter_parameters["address"]

    #Dump the private keys into the folder
    with open(f"data/private_keys/{election_name}/voter_{voter_serial}.json","w") as voter_file:
        voter_object = {"private": private_key}
        voter_file.write(json.dumps(voter_object))
    
    #Enroll the voters, and keep track for later use
    all_voters.append((public_key,ethereum_address))
    
    #Enroll Voter Arguments are Encrypted name, address, and pubkey
    voter_name_object = {"actual_name": f"Voter {voter_serial}","salt":str(randbits(256))}
    encrypted_name_string = encrypt(authority_pubkey,json.dumps(voter_name_object))
    contract.functions.enrollVoter(encrypted_name_string, ethereum_address,public_key).transact(TxParams({"gasPrice": Wei(0)}))

#Create an election with whatever the second command line argument is 

contract.functions.createElection(election_name).transact(TxParams({"gasPrice": Wei(0)}))

#Put in Four Candidates with 2 Roles: President and Senator
#Presidential Candidates are Emilio Aguinaldo and Jose Laurel
#Senator Candidates are Manuel Roxas and Elpidio Quirino
all_candidates = [
                ("President",election_name,"Emilio Aguinaldo",0),
                ("President", election_name,"Jose Laurel",1),
                ("Senator", election_name, "Manuel Roxas",2),
                ("Senator", election_name,"Elpidio Quirino",3)
                ]

for every_role, election_name, full_name, candidate_id in all_candidates:
    contract.functions.addCandidatetoElection(every_role, election_name, full_name, candidate_id).transact(TxParams({"gasPrice": Wei(0)}))

#Enroll all these voters in the election
for _,ethereum_address in all_voters:
    print(f"Trying to enroll {ethereum_address} in {election_name}")
    contract.functions.ChangeParticipation(ethereum_address,election_name,True).transact(TxParams({"gasPrice": Wei(0)}))

sleep(20)
#Get an authentication token from the authority daemon
authentication_response = requests.get("http://127.0.0.1/get_authority_token")
encrypted_token = authentication_response.text
decrypted_token = decrypt(authority_key,encrypted_token)

#Start the election in 1970
start_date = "Wed, 31 Dec 1969 16:00:00 GMT"

#End the election in 2064
end_date = "Wed, 31 Dec 2064 16:00:00 GMT"

#Set Up Post Body for Dates
post_body = {
    "start_Date_string": start_date,
    "end_Date_string": end_date,
    "token": decrypted_token
}

#Post the Dates to the Authority Daemon
requests.post(f"http://127.0.0.1/store_dates/{election_name}", json=post_body) 