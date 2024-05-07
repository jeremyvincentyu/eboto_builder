import json
from hashlib import sha256
from voter import Voter
from hashlib import sha256
from os import mkdir, path
from protolist import ProtoList
#An election has a list of voter histories, indexed by voter addresses
class Election:
    def __init__(self, election_name: str, threshold: str,all_elections: ProtoList, isolator_token: list[str]):
        #If the election does not exist in the filesystem yet, create it.
        folder_name = sha256(election_name.encode()).hexdigest()
        election_folder = f"data/elections/{folder_name}"
        config_file_path = f"{election_folder}/config.json"
        
        if not path.exists(config_file_path):
            mkdir(election_folder)
            serialized_election: dict[str,str] = {
            "threshold": threshold,
            "keyset" :"[]",
            "election_done": "false",
            }
            stringified_parameters = json.dumps(serialized_election)
            with open(config_file_path,"w") as config_file:
                config_file.write(stringified_parameters)
        
        self.threshold = int(threshold)
        self.election_name = election_name

        self.election_hash = sha256(election_name.encode()).hexdigest()
        self.voters: dict[str,Voter] = {}

        
        self.flushing_started = False

        self.all_elections = all_elections

        #Remember to read this from persistence
        self.election_done = False
        self.isolator_token = isolator_token
    
    def end_election(self):
        folder_name = sha256(self.election_name.encode()).hexdigest()
        election_folder = f"data/elections/{folder_name}"
        config_file_path = f"{election_folder}/config.json"
        serialized_election: dict[str,str] = {
            "threshold": str(self.threshold),
            "keyset" : json.dumps(self.control_keys),
            "election_done": "true",
        }
        stringified_parameters = json.dumps(serialized_election)
        with open(config_file_path,"w") as config_file:
                config_file.write(stringified_parameters)
        #Remember to write this back into file
        self.election_done = True

    def register_keyset(self, control_keys: str):
        folder_name = sha256(self.election_name.encode()).hexdigest()
        election_folder = f"data/elections/{folder_name}"
        config_file_path = f"{election_folder}/config.json"
        serialized_election: dict[str,str] = {
            "threshold": str(self.threshold),
            "keyset" : control_keys,
            "election_done": json.dumps(self.election_done),
        }
        stringified_parameters = json.dumps(serialized_election)
        with open(config_file_path,"w") as config_file:
                config_file.write(stringified_parameters)
        self.control_keys: list[dict[str,str]] = json.loads(control_keys)
        self.load_voters_from_control_keys()

    def load_voters_from_control_keys(self):
        for every_keypair in self.control_keys:
            self.voters[every_keypair["address"]] = Voter(every_keypair,self.election_name,self.isolator_token)
    
    def request_auth_token(self,control_address: str):
        print(f"Control address registered is {control_address in self.voters}")
        return self.voters[control_address].request_auth_token()
    
    def quota_reached(self)->bool:
        action_counter: int = 0
        
        for _,voter in self.voters.items():
            if voter.voter_acted:
                action_counter += 1

        return action_counter >= self.threshold
    
    def download_history(self, control_address: str, auth_token: str):
        return self.voters[control_address].download_history(auth_token)
    
    def get_history_signature_length(self, control_address: str, auth_token: str)->str:
        return self.voters[control_address].get_history_signature_length(auth_token)

    def get_history_tx_length(self, control_address: str, auth_token: str)->str:
        return self.voters[control_address].get_history_tx_length(auth_token)
    
    def submit_voter_transaction(self, control_address: str,transaction: str,auth_token: str)->str:
        total_participants = len(self.voters)
        remaining_unprocessed = self.count_unprocessed_transactions()

        #If the flushing already started and is close to finishing, turn down new transactions.
        if remaining_unprocessed < total_participants and self.flushing_started and self.all_elections.late_phase_imminent(self.election_name):
            #Turn down the transactions
            return "Wait"
        
        signature = self.voters[control_address].voter_post_transaction(transaction,auth_token)

        #Every time a voter submits a transaction, check if the quota was reached.
        #If so, and if flushing has not begun yet, start flushing
        if self.quota_reached():
            self.flush()

        return signature
    
    def flush(self):
        #In random order, transfer the transactions and signature histories of each voter into the blockchain, 
        #but do so in another thread
        if not self.flushing_started:
            for _,voter in self.voters.items():
                voter.start_flushing()
        self.flushing_started = True

    def count_unprocessed_transactions(self)->int:
        unprocessed_transactions: int = 0
        for _,voter in self.voters.items():
            unprocessed_transactions += voter.count_remaining_transactions()
        return unprocessed_transactions
    
    def ea_post_transaction(self, control_address: str, transaction: str):
        self.voters[control_address].ea_post_transaction(transaction)

    def done_flushing(self)->bool:
        unprocessed_transactions = self.count_unprocessed_transactions()
        print(f"{unprocessed_transactions} of election {self.election_name} left")
        return (unprocessed_transactions == 0) and self.flushing_started

#For Persistence
#Assume that an election cannot be interrupted mid-flush
def election_from_json_file(election_name: str, election_list: ProtoList, isolator_token: list[str]):
    folder_name = sha256(election_name.encode()).hexdigest()
    election_folder = f"data/elections/{folder_name}"
    config_file_path = f"{election_folder}/config.json"
    with open(config_file_path,"r") as election_file:
        serialized_election: dict[str,str] = json.loads(election_file.read())
    threshold = serialized_election["threshold"]
    new_election = Election(election_name,threshold,election_list,isolator_token)
    keyset = serialized_election["keyset"]
    election_done: bool = json.loads(serialized_election["election_done"])
    new_election.election_done = election_done
    new_election.register_keyset(keyset)
    return new_election
