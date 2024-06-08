#Set up a web3 context for late phase behavior
from web3 import Web3
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from web3.contract.contract import Contract
from web3.types import TxParams,Wei
from control_pair import ControlPair
from eth_crypto import encrypt,private2public
from eth_account import Account
from voter_replay import replay_history
from candidate import Candidate,group_candidates_by_role
from random import randint
import json

def full_candidate(election_name: str, candidate_id: int, contract: Contract):
    candidate_info: tuple[int, str, str] = contract.functions.getCandidateData(election_name,candidate_id).call()
    return Candidate(candidate_info[0],candidate_info[1],candidate_info[2])


class ControlVoter:
    def __init__(self, control: ControlPair, election_name: str):
        self.private_key = control.control_key
        self.address = control.control_address
        
        rpc_address = "http://127.0.0.1:8545"
        self.web3_instance = Web3(Web3.HTTPProvider(rpc_address))
        self.account = Account.from_key(self.private_key)

        self.web3_instance.middleware_onion.inject(geth_poa_middleware,layer=0)
        self.web3_instance.eth.default_account = self.account.address
        self.web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(private_key_or_account=self.account))
        self.election_name = election_name

        #Set up the contract
        with open("data/deployed_addresses.json","r") as address_file:
            address_string = address_file.read()
            address_object = json.loads(address_string)
            actual_address  = self.web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
        
        with open("data/abi.json","r") as abi_file:
            abi_string = abi_file.read()
            actual_abi = json.loads(abi_string)
        

        self.contract: Contract = self.web3_instance.eth.contract(address=actual_address,abi=actual_abi)

    def cast_vote(self):
        #Download the associated history
        voter_data:tuple[list[str],list[str],str] = self.contract.functions.download_history(self.election_name).call()
        voter_history = voter_data[0]
        
        #Play back the history and Get the true marker
        marker_array = replay_history(self.private_key, voter_history)
        true_marker = marker_array[0]

        #Decode the candidates into proper roles
        all_candidate_ids: list[int] = self.contract.functions.getCandidates(self.election_name).call()
        all_candidates = [full_candidate(self.election_name, every_id,self.contract) for every_id in all_candidate_ids]
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
        public_key = private2public(self.private_key)
        encrypted_form = encrypt(public_key, plain_transaction_string)

        
        #Submit the transaction to the smart contract
        self.contract.functions.submit_voter_transaction(self.election_name,encrypted_form).transact(TxParams({"gasPrice": Wei(0)}))