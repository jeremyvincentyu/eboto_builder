from threading import Thread, Lock
from web3 import Web3
from web3.contract.contract import Contract
from web3.types import TxParams,Wei
from eth_crypto import decrypt,sign
from candidate import Candidate, group_candidates_by_role
from os import path
from flask import Request
from datetime import datetime, timedelta
from dateutil import parser
from dateutil.tz import tzutc
from time import sleep
from voter_replay import replay_history
from voter import Voter
from random import randint
from pool_manager import allocate_accounts
from isolator import Isolator

import json

#An election has a start dates, an end date, and participants
class Election:
    def __init__(self, election_hash: str, election_name: str, contract: Contract, private_key: str, web3_instance: Web3):
        self.election_name = election_name
        self.election_hash = election_hash
        self.mutex = Lock()
        self.watcher_thread = Thread(target=self.watch)
        self.election_done = False
        self.contract = contract
        self.candidates_by_role: dict[str,list[Candidate]] = {}
        self.private_key:str = private_key 
        self.election_results: dict[int,int] = {}
        self.web3_instance = web3_instance
        
        #Grab all the control keys
        self.allocated_keys: list[dict[str,str]] = []
        self.isolator = Isolator(self.election_name,self.private_key,self.contract)
    
    def read_election_data(self):
        self.mutex.acquire()
        if path.exists(f"data/dates/{self.election_hash}"):
            with open(f"data/dates/{self.election_hash}","r") as election_file:
                election_dates = election_file.read()
                self.mutex.release()
                return election_dates
        self.mutex.release()
        return "nonexistent"

    def build_candidate_list(self):
        all_candidate_ids: list[int] = self.contract.functions.getCandidates(self.election_name).call()
        self.candidate_ids = all_candidate_ids
        candidate_list: list[Candidate] = list()
        for every_id in all_candidate_ids:
            new_candidate = self.contract.functions.getCandidateData(self.election_name,every_id).call()
            candidate_list.append(Candidate(new_candidate[0],new_candidate[1],new_candidate[2]))
        self.candidates_by_role = group_candidates_by_role(candidate_list)
    
    def write_election_data(self, request: Request):
        self.mutex.acquire()
        with open(path.join("data", "dates", self.election_hash),"w") as datefile:
            #print(f"JSON content: {request.get_json()}")
            datefile.write(json.dumps(request.get_json()))
        self.mutex.release()
    
    def watch(self):
        while not self.election_done:
            print("Still watching election")
            #Check if the election is not yet over, and that it is the 
            look_for_signatures = self.check_election() and self.isolator.late_phase()
            print(f"look_for_signatures evaluates to {look_for_signatures}")

            #If the election is still going, check every voter history and see if a signature is necessary
            #This is only for the late phase
            #For the early phase, the isolator will manually trigger signatures
            #This function
            if look_for_signatures:
                print("Looking for new transactions to sign")
                self.sign_new_transactions()

            sleep(5)

    #This function signs a single transaction but does not publish it to the blockcha
    def sign_single_transaction(self,message: str):
        return sign(self.private_key,message)
    
    #Push a pre-existing signature to the blockchain
    def push_signature_to_chain(self, some_signature: str, control_address: str):
        self.contract.functions.sign_voter_transaction(self.election_name, control_address, some_signature).transact(TxParams({"gasPrice": Wei(0)}))
    
    #This function should only be called during the late phase
    def sign_new_transactions(self):
        #Iterate over the control keys
        for every_key in self.allocated_keys:
            control_address = every_key["address"]
            history = self.contract.functions.download_voter_history(self.election_name,control_address).call()
            voter_transaction: list[str] = history[0]
            signatures: list[str] = history[1]
            
            #Check each key to see if the histories and the signatures line up
            if len(voter_transaction)>len(signatures):
                #If not, sign every single late transaction until the keys and signatures line up
                for transaction_id in range(len(signatures),len(voter_transaction)):
                    transaction = voter_transaction[transaction_id]
                    signature = self.sign_single_transaction(transaction)
                    self.contract.functions.sign_voter_transaction(self.election_name,control_address,signature).transact(TxParams({"gasPrice": Wei(0)}))
                    print(f"Just signed {transaction} with signature {signature}")
            
    
    def end_and_tally(self):
        #Cleanup before Ending Election
        self.build_candidate_list()
        self.election_done = True
        
        #Check if it is the late phase and if so, sign any straddlers.
        if self.isolator.late_phase():
            self.sign_new_transactions()
        

        #Check if flushing is done already. If not, force the flush. Check is integrated into the isolator method.
        self.isolator.flush_election()

        #Actually end election
        self.contract.functions.end_election(self.election_name).transact(TxParams({"gasPrice": Wei(0)}))
        
        #Initialize all candidates to have 0 votes
        for every_id in self.candidate_ids:
            self.election_results[every_id] = 0
        
        #Actually tally
        #Convert every single voter history into a ballot and update the election results accordingly
        for every_key in self.allocated_keys:
            self.regenerate_ballot(every_key)

        #Finally, upload the results back into the blockchain
        for every_candidate in self.candidate_ids:
            self.contract.functions.set_election_results(self.election_name,every_candidate,self.election_results[every_candidate]).transact(TxParams({"gasPrice": Wei(0)}))

    def regenerate_ballot(self,control_key: dict[str,str]):
        voter_address = control_key["address"]
        decryption_key = control_key["private"]
        voter_data:tuple[list[str],list[str],str] = self.contract.functions.download_voter_history(self.election_name,voter_address).call()
        voter_history = voter_data[0]
        encrypted_ea_height = voter_data[2]
        salted_ea_height: dict[str,str] = json.loads(decrypt(self.private_key,encrypted_ea_height))
        decrypted_ea_height  = int(salted_ea_height["height"])
        print(f"The height at which the EA stopped for {voter_address} is {decrypted_ea_height}")
        final_ballot = replay_history(decryption_key, voter_history, decrypted_ea_height,self.candidate_ids)
        for every_id in final_ballot:
            if final_ballot[every_id]:
                self.election_results[every_id] += 1
    
    #Returns true when the election is going and false if it is not
    #Also primes the election if priming is necessary
    def check_election(self)->bool:
        #Check first if the election claims to have ended already.
        #If so, it is meaningless to keep checking it, so just return without watching
        #print(f"Contract Type:{type(self.contract)}")
        #print("Running check election")
        if self.contract.functions.is_election_over(self.election_name).call():
            #print(f"Election {self.election_name} is already over")
            self.election_done = True
            return False

        #Get the current time
        current_time = datetime.now(tz=tzutc())
        #print(f"Current time is {current_time}")
        #Parse the start and end dates
        dates: dict[str,str] = json.loads(self.read_election_data()) 
        start_date = parser.parse(dates["start_Date_string"])
        end_date = parser.parse(dates["end_Date_string"])

        self.mutex.acquire()
        #Check if current time has already exceeded end time. If so, end and tally. 
        election_time_up = current_time > end_date
        if election_time_up:
            self.end_and_tally()
            return False

        #Next, check if it is less than 5 hours before the election starts
        #And that the election hasn't been made visible yet
        #print(f"Start date less current time is {start_date - current_time}")
        prep_time: bool = start_date - current_time < timedelta(hours=5)
        not_visible:bool = not (self.contract.functions.is_visible(self.election_name).call())
        #print(f"prep time evaluates to {prep_time}")
        #print(f"not visible evaluates to {not_visible}")
        must_start_priming = prep_time and not_visible

        #If so, perform priming
        if must_start_priming:
            self.prime_election()

        self.mutex.release()
        return True
    
    def prime_election(self):
        #Get all voters and identify which ones are part of the election 
        all_voters: list[tuple[str,str,str,list[str]]] = self.contract.functions.downloadVoterList().call()
        structured_voters: dict[str,Voter] = {}
        for every_voter in all_voters:
            voter_address = every_voter[2]
            voter_pubkey = every_voter[1]
            voter_election = every_voter[3]
            if self.election_name in voter_election:
                structured_voters[voter_address] = Voter(voter_address,voter_pubkey,self.contract,self.election_name)
        
        #Allocate a key to each voter
        participating_count = len(structured_voters.keys())
        allocated_keys = allocate_accounts(participating_count,self.election_hash)
        self.allocated_keys = allocated_keys.copy()
        for every_voter in structured_voters:
            voter_object = structured_voters[every_voter]
            allocated_key = allocated_keys.pop(randint(0,len(allocated_keys)-1))
            voter_object.allocate_control_key(allocated_key["private"],allocated_key["address"])
        
        #In random order, authorize the control keys and assign addresses to each voter
        addresses_to_authorize = list(structured_voters.keys())
        keys_to_assign = list(structured_voters.keys())

        while len(addresses_to_authorize)>0 or len(keys_to_assign)>0:
            #If there are both addresses to authorize and keys to assign,
            #randomly choose between doing either
            #Then randomly choose an account to perform the action with
            if len(addresses_to_authorize)>0 and len(keys_to_assign)>0:
                random_action = randint(0,1)
                if random_action == 0:
                    random_address = addresses_to_authorize.pop(randint(0,len(addresses_to_authorize)-1))
                    structured_voters[random_address].authorize_control_address()
                else:
                    random_address = keys_to_assign.pop(randint(0,len(keys_to_assign)-1))
                    structured_voters[random_address].assign_control_key()
            
            #If there are only keys to assign, only choose an account to assign an address to
            elif len(keys_to_assign) > 0:
                random_address = keys_to_assign.pop(randint(0,len(keys_to_assign)-1))
                structured_voters[random_address].assign_control_key()
            
            #If there are only addresses to authorize, only choose an account to authorize the address of
            else:
                random_address=addresses_to_authorize.pop(randint(0,len(addresses_to_authorize)-1))
                structured_voters[random_address].authorize_control_address()


        self.contract.functions.make_visible(self.election_name).transact(TxParams({"gasPrice": Wei(0)}))

        #Build out the candidate list
        self.build_candidate_list()      

        #Use the isolator to perform a random sequence of actions for each control key,
        #Adding them each to the isolator
        self.isolator.prime_all_voters(self.allocated_keys,self.candidates_by_role)

    def start_watching(self):
        self.watcher_thread.start()