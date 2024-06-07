from web3 import Web3
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from web3.contract.contract import Contract
import json
from eth_crypto import private2public,generate_keypair,encrypt,decrypt
from eth_account import Account
from voter import Voter
from secrets import randbits
from web3.types import TxParams,Wei
from time import sleep
import requests

class Authority:
    def __init__(self):    
        with open("data/authority.json","r") as authority_file:
                key_string = authority_file.read()
                key_dict = json.loads(key_string)
                self.authority_key = key_dict["private"]
                self.authority_pubkey = private2public(self.authority_key)
        
        #Start by Setting Up a Web3 Context, complete with authority account and signer
        rpc_address = "http://127.0.0.1:8545"
        self.web3_instance = Web3(Web3.HTTPProvider(rpc_address))
        authority_account = Account.from_key(self.authority_key)
        authority_address = authority_account.address
        self.web3_instance.middleware_onion.inject(geth_poa_middleware,layer=0)
        self.web3_instance.eth.default_account = authority_address
        self.web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=authority_account))
    
        #Set up the contract
        with open("data/deployed_addresses.json","r") as address_file:
            address_string = address_file.read()
            address_object = json.loads(address_string)
            actual_address  = self.web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
        
        with open("data/abi.json","r") as abi_file:
            abi_string = abi_file.read()
            actual_abi = json.loads(abi_string)
        

        self.contract: Contract = self.web3_instance.eth.contract(address=actual_address,abi=actual_abi)
    
    def enroll_voters(self, n: int)->list[Voter]:
        all_voters: list[Voter] = []
        for voter_serial in range(n):
            #Generate Keypair
            new_voter_parameters = json.loads(generate_keypair())

            #Extract Parameters
            private_key = new_voter_parameters["privateKey"]
            public_key = new_voter_parameters["publicKey"]
            ethereum_address = new_voter_parameters["address"]
    
            #Enroll the voters, and keep track for later use
            all_voters.append(Voter(private_key))
    
            #Enroll Voter Arguments are Encrypted name, address, and pubkey
            voter_name_object = {"actual_name": f"Voter {voter_serial}","salt":str(randbits(256))}
            encrypted_name_string = encrypt(self.authority_pubkey,json.dumps(voter_name_object))
            self.contract.functions.enrollVoter(encrypted_name_string, ethereum_address,public_key).transact(TxParams({"gasPrice": Wei(0)}))
        self.all_voters = all_voters
        return all_voters
    
    def create_election(self, n: int, trial: int):

        election_name = f"{n}_voters_trial_{trial}"

        #Add the election to the smart contract
        self.contract.functions.createElection(election_name).transact(TxParams({"gasPrice": Wei(0)}))

        #Wait 5 seconds to make sure the election really got in
        sleep(5)
        
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
            self.contract.functions.addCandidatetoElection(every_role, election_name, full_name, candidate_id).transact(TxParams({"gasPrice": Wei(0)}))

        #Enroll the first n voters in the election
        for every_voter in self.all_voters[:n]:
            print(f"Trying to enroll {every_voter.address} in {election_name}")
            self.contract.functions.ChangeParticipation(every_voter.address,election_name,True).transact(TxParams({"gasPrice": Wei(0)}))

        #Wait 20 seconds
        sleep(20)

        #Inform the authority daemon about the election
        #Get an authentication token from the authority daemon
        authentication_response = requests.get("http://127.0.0.1/get_authority_token")
        encrypted_token = authentication_response.text
        decrypted_token = decrypt(self.authority_key,encrypted_token)

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
    
    def end_election(self,election_name: str):
        #Get an authentication token from the authority daemon
        authentication_response = requests.get("http://127.0.0.1/get_authority_token")
        encrypted_token = authentication_response.text
        
        #Decrypt the master token
        decrypted_token = decrypt(self.authority_key,encrypted_token)
        
        #Use it to force an election to end
        end_body = {"token": decrypted_token}
        requests.post(f"http://127.0.0.1/force_end_election/{election_name}", json = end_body)

        #Block until the election has actually ended
        election_ended = False
        while not election_ended:
            #Post an HTTP Request to check the status of the election
            checker_request = requests.post(f"http://127.0.0.1/check_force_end/{election_name}", json=end_body)

            #Update election_ended
            election_ended = checker_request.json()

            #If not yet ended, sleep for 5 seconds
            if not election_ended:
                sleep(5)