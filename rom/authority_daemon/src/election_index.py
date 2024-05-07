from web3 import Web3
from web3.contract.contract import Contract
from election import Election
from os import path
from hashlib import sha256
from flask import Request
import json
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from eth_account import Account

class ElectionIndex:
    def __init__(self) -> None:
        self.election_list: dict[str,Election] = {}
        self.web3_instance = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
        self.web3_instance.middleware_onion.inject(geth_poa_middleware,layer=0)
        with open("data/authority.json","r") as keyfile:
            keyfile_object: dict[str,str] = json.loads(keyfile.read()) 
            self.authority_account = Account.from_key(keyfile_object["private"])
            self.private_key = keyfile_object["private"]

        self.web3_instance.eth.default_account  = self.authority_account.address    
        self.web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=self.authority_account))

        self.initialize_contract()
        self.load_index()
        self.watch_elections()

    
    def initialize_contract(self):
        with open("src/deployed_addresses.json","r") as address_file:
            address_object: dict[str,str] = json.loads(address_file.read())
            actual_address  = self.web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
            with open("src/EA_Account.json","r") as abi_file:
                actual_abi = json.loads(abi_file.read())
                self.contract: Contract= self.web3_instance.eth.contract(address=actual_address,abi=actual_abi)
    
    def load_index(self):
        if path.exists("data/election_list.txt"):
            with open("data/election_list.txt", "r") as election_file:
                names_to_hashes: dict[str,str] = json.loads(election_file.read())
                for every_name in names_to_hashes:
                    election_filename = names_to_hashes[every_name]
                    self.election_list[every_name] = Election(election_filename,every_name,self.contract,self.private_key, self.web3_instance)
    
    def add_election(self, election_name: str):
        election_hash = sha256(election_name.encode()).hexdigest()
        self.election_list[election_name] = Election(election_hash,election_name,self.contract,self.private_key,self.web3_instance)
        with open("data/election_list.txt","w") as election_file:
            names_to_hashes =  {every_election:self.election_list[every_election].election_hash for every_election in self.election_list}
            election_file.write(json.dumps(names_to_hashes))
        self.election_list[election_name].start_watching()

    def change_election_dates(self,election_name: str, request: Request):
        if election_name not in self.election_list:
            self.add_election(election_name)
        actual_election = self.election_list[election_name]
        actual_election.write_election_data(request)

    def read_election_data(self, election_name: str)-> str:
        return self.election_list[election_name].read_election_data()

    def watch_elections(self):
        for every_election in self.election_list:
            self.election_list[every_election].start_watching()
    
    def force_end(self,election_name: str):
        print("Descended into election index")
        self.election_list[election_name].end_and_tally()
    
    def sign_transaction(self,election_name: str, some_transaction: str)-> str:
        return self.election_list[election_name].sign_single_transaction(some_transaction)
    
    def push_signature(self,election_name: str, control_address: str, signature: str):
        self.election_list[election_name].push_signature_to_chain(signature,control_address)