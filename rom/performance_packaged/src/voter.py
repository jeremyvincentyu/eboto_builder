#Set up a web3 context for late phase behavior
from web3 import Web3
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from web3.contract.contract import Contract
from voter_replay import replay_history
from eth_account import Account
from eth_crypto import decrypt, encrypt,private2public
import json
import requests
from candidate import Candidate, group_candidates_by_role
from random import randint
from control_pair import ControlPair
from control_account import ControlVoter
from time import sleep

def full_candidate_http(election_name: str, candidate_id: int):
    candidate_request_body = {"election_name": election_name,"candidate_id": str(candidate_id)}
    candidate_request = requests.get("http://127.0.0.1/get_candidate_data", json = candidate_request_body)
    candidate_data = candidate_request.json()

    return Candidate(candidate_id,candidate_data["name"],candidate_data["role"])

def identify_control_pair(election_name: str, some_private_key: str):
    #Compute the direct address of the given private key
    voter_account = Account.from_key(some_private_key)
    address = voter_account.address
    
    body = {"election_name": election_name, "voter_address": address}
    
    #Pass this address to the isolator and get the encrypted control key back
    control_key_request = requests.post("http://127.0.0.1/retrieve_control_key", json=body)
    control_key_encrypted = control_key_request.text
    #print(f"Encrypted control key is {control_key_encrypted}" )
    
    #Decrypt the control key
    control_key_object = json.loads(decrypt(some_private_key,control_key_encrypted))
    control_key = control_key_object["election_key"]
    
    #Convert the decrypted key into an address
    control_account = Account.from_key(control_key)
    control_address = control_account.address

    #Return that address
    return ControlPair(control_key=control_key,control_address=control_address)

def identify_control_pair_late(election_name: str, some_private_key: str, smart_contract: Contract):
    #Compute the direct address of the given private key
    voter_account = Account.from_key(some_private_key)
    address = voter_account.address
    
    
    #Pass this address to the smart contract and get the encrypted control key back
    control_key_encrypted = smart_contract.functions.retrieve_control_key(election_name,address).call()

    #print(f"Encrypted control key is {control_key_encrypted}" )
    
    #Decrypt the control key
    control_key_object = json.loads(decrypt(some_private_key,control_key_encrypted))
    control_key = control_key_object["election_key"]
    
    #Convert the decrypted key into an address
    control_account = Account.from_key(control_key)
    control_address = control_account.address

    #Return that address
    return ControlPair(control_key=control_key,control_address=control_address)


class Voter:
    def __init__(self, private_key: str):
        self.private_key = private_key
        self.public_key = private2public(private_key)
        #Set up a web3 context
        rpc_address = "http://127.0.0.1:8545"
        self.web3_instance = Web3(Web3.HTTPProvider(rpc_address))
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        self.web3_instance.middleware_onion.inject(geth_poa_middleware,layer=0)
        self.web3_instance.eth.default_account = self.address
        self.web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=self.account))
        
        #Set up the contract
        with open("data/deployed_addresses.json","r") as address_file:
            address_string = address_file.read()
            address_object = json.loads(address_string)
            actual_address  = self.web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
        
        with open("data/abi.json","r") as abi_file:
            abi_string = abi_file.read()
            actual_abi = json.loads(abi_string)
        

        self.contract: Contract = self.web3_instance.eth.contract(address=actual_address,abi=actual_abi)
       

    def cast_vote(self,election_name: str):
        #Begin by checkin if it is the late phase
        late_phase_request = requests.get("http://127.0.0.1/late_phase")
        late_phase: bool = late_phase_request.json()

        #If it is still the early phase, do everything with HTTP Requests
        if not late_phase:
            self.early_phase(election_name)

        #If it is the late phase, do everything with smart contract calls
        else:
            self.late_phase(election_name)

    def early_phase(self, election_name: str):
        #Begin by downloadin a control pair
        control_pair = identify_control_pair(election_name,self.private_key)
        
        #Get an authentication token
        token_body ={"election_name": election_name, "control_address": control_pair.control_address}
        crypted_token = requests.post("http://127.0.0.1/request_auth_token", json = token_body)
        auth_token = decrypt(control_pair.control_key,crypted_token.text)

        #Download the associated history
        history_body = {"election_name": election_name, "control_address": control_pair.control_address,"auth_token": auth_token}
        history_request = requests.post("http://127.0.0.1/download_history",json=history_body)
        history = history_request.json()

        #Play back the history and Get the true marker
        marker_array = replay_history(control_pair.control_key, history)
        true_marker = marker_array[0]

        #Decode the candidates into proper roles
        candidate_id_body = {"actual_name": election_name}
        candidate_id_list =  requests.post("http://127.0.0.1/get_candidates", json=candidate_id_body)
        all_candidate_ids: list[int] = candidate_id_list.json()
        all_candidates = [full_candidate_http(election_name, every_id) for every_id in all_candidate_ids]
        candidates_by_role = group_candidates_by_role(all_candidates)

        #Cast a valid vote using the true marker 
        #Prepare other marker fields firsr
        swap1 = str(randint(0,len(marker_array)-1))
        swap2 = str(randint(0,len(marker_array)-1))

        transaction = {"transaction_type": "3",
                        "marker":true_marker,
                        "swap1": swap1,
                        "swap2": swap2
                      }

        for _,candidates_in_role in candidates_by_role.items():
            voted_candidate_position = randint(0,len(candidates_in_role)-1)
            voted_candidate = candidates_in_role[voted_candidate_position]

            for every_position in range(voted_candidate_position):
                transaction[str(candidates_in_role[every_position].id)] = "0"

            transaction[str(voted_candidate.id)] = "1"

            for every_position in range(voted_candidate_position+1,len(candidates_in_role)):
                transaction[str(candidates_in_role[every_position].id)] = "0"
        
        plain_transaction_string = json.dumps(transaction)
        
        #Encrypt the transaction
        public_key = private2public(control_pair.control_key)
        encrypted_form = encrypt(public_key, plain_transaction_string)
        transaction_with_metadata = {
        "auth_token":auth_token, 
        "transaction": encrypted_form,
        "control_address": control_pair.control_address,
        "election_name": election_name
        }
        
        #Submit the transaction to the isolator

        isolator_response = requests.post(f"http://127.0.0.1/submit_voter_transaction",json=transaction_with_metadata)
        isolator_text = isolator_response.text
        
        #If the isolator responds with a wait,
        if isolator_text == "Wait":
            #Then wait till the late phase starts
            late_phase_started = False
            while not late_phase_started:
                phase_check_request = requests.get("http://127.0.0.1/late_phase")
                late_phase_started = phase_check_request.json()
                if not late_phase_started:
                    sleep(5)

            #And execute the late phase command when it does
            self.late_phase(election_name)


    
    def late_phase(self, election_name: str):
        #Begin by downloading a control pair
        control_pair = identify_control_pair_late(election_name,self.private_key,self.contract)
        
        #Bind the control pair to a controlvoter
        control_voter = ControlVoter(control_pair, election_name)

        #Have the control voter cast the vote randomly
        control_voter.cast_vote()

        