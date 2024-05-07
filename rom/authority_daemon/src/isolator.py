import requests
from eth_crypto import decrypt, encrypt, private2public
from candidate import Candidate
from random import random, randint
from secrets import randbits
from hashlib import sha256
from math import floor
from time import sleep
from web3.contract.contract import Contract
from web3.types import TxParams,Wei
import json

class Isolator:
    def __init__(self, election_name: str,  private_key: str, contract: Contract):
        self.election_name = election_name
        self.private_key = private_key
        self.contract = contract
        encrypted_challenge_token:str = requests.get(f"http://127.0.0.1/get_master_token").text
        self.auth_token = decrypt(self.private_key,encrypted_challenge_token)

    def add_marker(self, marker_array: list[str], revocation_list: list[str])->str:
        new_marker_base = str(randbits(256)).encode()
        actual_new_marker = sha256(new_marker_base).hexdigest()

        while actual_new_marker in marker_array or actual_new_marker in revocation_list:
            new_marker_base = str(randbits(256)).encode()
            actual_new_marker = sha256(new_marker_base).hexdigest()
        
        marker_array.append(actual_new_marker)
        swap1 = "0"
        swap2 = "0"

        if len(marker_array) > 0:
            swap1 = str(randint(0,len(marker_array)-1))
            swap2 = str(randint(0,len(marker_array)-1))

        transaction: dict[str,str] = {"transaction_type":"0",
                                      "marker":actual_new_marker,
                                      "swap1":swap1,
                                      "swap2":swap2
                                      }
        
        for every_role in self.candidates_by_role:
            candidates_in_role = self.candidates_by_role[every_role]
            voted_candidate_position = randint(0,len(candidates_in_role)-1)
            voted_candidate = candidates_in_role[voted_candidate_position]

            for every_position in range(voted_candidate_position):
                transaction[str(candidates_in_role[every_position].id)] = "0"

            transaction[str(voted_candidate.id)] = "1"

            for every_position in range(voted_candidate_position+1,len(candidates_in_role)):
                transaction[str(candidates_in_role[every_position].id)] = "0"


        return json.dumps(transaction)

    def swap_markers(self,marker_array:list[str], position_1: int, position_2: int)->str:
        marker = marker_array[randint(0,len(marker_array)-1)]
        swap1 = str(position_1)
        swap2 = str(position_2)
        marker_array[position_1], marker_array[position_2] = marker_array[position_2],marker_array[position_1]
        transaction: dict[str,str] = {"transaction_type":"1",
                                       "marker":marker,
                                       "swap1":swap1,
                                       "swap2":swap2
                                     }
        
        for every_role in self.candidates_by_role:
            candidates_in_role = self.candidates_by_role[every_role]
            voted_candidate_position = randint(0,len(candidates_in_role)-1)
            voted_candidate = candidates_in_role[voted_candidate_position]

            for every_position in range(voted_candidate_position):
                transaction[str(candidates_in_role[every_position].id)] = "0"

            transaction[str(voted_candidate.id)] = "1"

            for every_position in range(voted_candidate_position+1,len(candidates_in_role)):
                transaction[str(candidates_in_role[every_position].id)] = "0"


        return json.dumps(transaction)
    
    def revoke_marker(self,marker: str,marker_array: list[str],revocation_list: list[str])->str:
        marker_array.remove(marker)
        revocation_list.append(marker)
        
        swap1 = "0"
        swap2 = "0"

        if len(marker_array) > 0:
            swap1 = str(randint(0,len(marker_array)-1))
            swap2 = str(randint(0,len(marker_array)-1))

        transaction: dict[str,str]={"transaction_type":"2", 
                                    "marker": marker, 
                                    "swap1": swap1,
                                    "swap2": swap2
                                    }
        
        for every_role in self.candidates_by_role:
            candidates_in_role = self.candidates_by_role[every_role]
            voted_candidate_position = randint(0,len(candidates_in_role)-1)
            voted_candidate = candidates_in_role[voted_candidate_position]

            for every_position in range(voted_candidate_position):
                transaction[str(candidates_in_role[every_position].id)] = "0"

            transaction[str(voted_candidate.id)] = "1"

            for every_position in range(voted_candidate_position+1,len(candidates_in_role)):
                transaction[str(candidates_in_role[every_position].id)] = "0"
        
        return json.dumps(transaction)

    def cast_poll(self,marker: str, marker_array: list[str])->str:
        swap1 = "0"
        swap2 = "0"

        if len(marker_array) > 0:
            swap1 = str(randint(0,len(marker_array)-1))
            swap2 = str(randint(0,len(marker_array)-1))
        
        transaction: dict[str,str] = {"transaction_type": "3",
                                      "marker":marker,
                                      "swap1": swap1,
                                      "swap2": swap2
                                     }
        
        for every_role in self.candidates_by_role:
            candidates_in_role = self.candidates_by_role[every_role]
            voted_candidate_position = randint(0,len(candidates_in_role)-1)
            voted_candidate = candidates_in_role[voted_candidate_position]

            for every_position in range(voted_candidate_position):
                transaction[str(candidates_in_role[every_position].id)] = "0"

            transaction[str(voted_candidate.id)] = "1"

            for every_position in range(voted_candidate_position+1,len(candidates_in_role)):
                transaction[str(candidates_in_role[every_position].id)] = "0"
        
        return json.dumps(transaction)


    def prime_all_voters(self,control_keys: list[dict[str,str]], candidate_by_role: dict[str,list[Candidate]]):
        self.control_keys = control_keys
        self.candidates_by_role: dict[str,list[Candidate]] = candidate_by_role
        threshold = str(floor((0.25 + 0.5*random())*len(self.control_keys)))
        encrypted_challenge_token:str = requests.get(f"http://127.0.0.1/get_master_token").text
        challenge_token = decrypt(self.private_key,encrypted_challenge_token)
        election_prime_parameters = {"challenge_token": challenge_token,
                                     "threshold": threshold,
                                     "election_name": self.election_name,
                                     "control_keys": json.dumps(control_keys)
                                     }
                                     
        requests.post("http://127.0.0.1/register_election",json=election_prime_parameters)
        
        for every_control in self.control_keys:
            self.prime_single_voter(every_control)
    
    def prime_single_voter(self,single_key: dict[str,str]):
        voter_address = single_key["address"]
        voter_key = single_key["private"]
        voter_pubkey = private2public(voter_key)
        marker_array: list[str] = []
        revocation_list: list[str] = []
        all_transactions: list[str] = []
        
        #Begin by requesting a challenge token
        encrypted_challenge_token:str = requests.get(f"http://127.0.0.1/get_master_token").text
        challenge_token = decrypt(self.private_key,encrypted_challenge_token)
        
        #Randomly add, swap, revoke, and poll using the challenge token
        while True:
            decider = random()
            
            #3 Probability Spreads

            #For an empty marker array:
            if len(marker_array) == 0:
                #100% chance of adding a marker
                all_transactions.append(self.add_marker(marker_array, revocation_list))
            

            #For a marker array of 1 element:
            elif len(marker_array) == 1:
                 #90% chance of add marker,
                if decider < 0.9:
                    all_transactions.append(self.add_marker(marker_array, revocation_list))
                #10% chance of revoking marker
                else:
                    all_transactions.append(self.revoke_marker(marker_array[0], marker_array,revocation_list))
        
            #For a market array of at least 2 elements
            else:
                # 17.5% chance of adding another marker: 0-0.15
                if 0 <= decider <0.175:
                    all_transactions.append(self.add_marker(marker_array, revocation_list))
                # 5% chance of swapping the 1st marker and second marker: 0.15-0.225
                elif 0.175 <= decider < 0.225:
                    all_transactions.append(self.swap_markers(marker_array,0,1))
                
                # 7.5% chance of swapping the 2nd marker and 1st marker: 0.225-0.30
                elif 0.225 <= decider <0.3:
                    all_transactions.append(self.swap_markers(marker_array,1,0))
                
                # 2.5% chance of swapping 1st marker with a random marker: 0.30-0.325
                elif 0.3 <=decider <0.325:
                    random_marker_position = randint(0,len(marker_array)-1)
                    all_transactions.append(self.swap_markers(marker_array,0,random_marker_position))
                
                # 2.5% chance of swapping a random marker with 1st marker: 0.325-0.35
                elif 0.325 <=decider <0.35:
                    random_marker_position = randint(0,len(marker_array)-1)
                    all_transactions.append(self.swap_markers(marker_array,random_marker_position,0))
                
                # 2.5% chance of swapping 2nd marker with a random marker: 0.35-0.0.375
                elif 0.35 <= decider < 0.375:
                    random_marker_position = randint(0,len(marker_array)-1)
                    all_transactions.append(self.swap_markers(marker_array,1,random_marker_position))

                # 2.5% chance of swapping a random marker with 2nd marker with : 0.375-0.40
                elif 0.375 <= decider < 0.4:
                    random_marker_position = randint(0,len(marker_array)-1)
                    all_transactions.append(self.swap_markers(marker_array,random_marker_position,1))

                # 5% chance of swapping 2 random markers: 0.40-0.45
                elif 0.4 <= decider < 0.45:
                    random_1 = randint(0,len(marker_array)-1)
                    random_2 = randint(0,len(marker_array)-1)
                    all_transactions.append(self.swap_markers(marker_array,random_1,random_2))
                
                # 10% chance of revoking a random marker: 0.45-0.55
                elif 0.45 <= decider <0.55:
                    random_marker_position = randint(0,len(marker_array)-1)
                    random_marker = marker_array[random_marker_position]
                    all_transactions.append((self.revoke_marker(random_marker, marker_array, revocation_list)))
                
                # 5% chance of revoking all markers: 0.55-0.60
                elif 0.55 <= decider <0.60:
                    for every_marker in marker_array:
                        all_transactions.append((self.revoke_marker(every_marker, marker_array, revocation_list)))

                # 10% chance of casting poll using first marker: 0.60-0.70
                elif 0.6 <= decider <0.7:
                    all_transactions.append(self.cast_poll(marker_array[0], marker_array))

                # 16% chance of revoking the first marker: 0.70-0.86
                elif 0.7 <= decider  <0.86:
                    marker = marker_array[0]
                    all_transactions.append(self.revoke_marker(marker,marker_array,revocation_list))

                # 10% chance of casting poll using random marker: 0.80-0.96
                elif 0.86<= decider < 0.96:
                    random_marker_position = randint(0,len(marker_array)-1)
                    random_marker = marker_array[random_marker_position]
                    all_transactions.append(self.cast_poll(random_marker, marker_array))
                
                # 4% chance of terminating: 0.96-1
                else:
                    #The encrypted_ea_height is now known; post it to the blockchain
                    salted_height = json.dumps({"height": str(len(all_transactions)), "salt": str(randbits(256))})
                    ea_public_key = private2public(self.private_key)
                    encrypted_height = encrypt(ea_public_key,salted_height)
                    self.contract.functions.set_encrypted_ea_height(self.election_name,voter_address,encrypted_height).transact(TxParams({"gasPrice": Wei(0)}))
                    break

        for every_transaction in all_transactions:
            #Encrypt every transaction and post each encrypted form into the isolation server
            encrypted_form = encrypt(voter_pubkey,every_transaction)
            transaction_with_metadata = {"auth_token": challenge_token,"transaction": encrypted_form,"control_address": voter_address, "election_name": self.election_name}
            requests.post(f"http://127.0.0.1/ea_post_transaction",json=transaction_with_metadata)
    
    def late_phase(self)->bool:
        isolator_response = requests.get("http://127.0.0.1/late_phase").text
        return json.loads(isolator_response)
    
    def flush_election(self):
        request_body ={
        "auth_token": self.auth_token,
        "election_name": self.election_name 
        }
        #Check first if the election is done flushing
        election_flushed_response = requests.post("http://127.0.0.1/done_flushing", json=request_body)
        election_flushed: bool = election_flushed_response.json()
        
        #If not, force a flush
        if not (election_flushed):
            requests.post("http://127.0.0.1/force_flush", json=request_body)
        
        
        #Block until flushing is done
        while not election_flushed:
            election_flushed_response = requests.post("http://127.0.0.1/done_flushing", json=request_body)
            election_flushed: bool = election_flushed_response.json()
            sleep(5)
