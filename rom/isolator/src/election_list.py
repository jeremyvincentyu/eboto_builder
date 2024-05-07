from election import Election,election_from_json_file
from os import path
from protolist import ProtoList
import json
class ElectionList(ProtoList):
    def __init__(self, isolator_token: list[str]):
        self.election_list: dict[str,Election] = {}
        self.datapath = "data/election_list.json"
        self.isolator_token = isolator_token
        if path.exists(self.datapath):
            #print(f"Confirmed that {self.datapath} exists")
            with open(self.datapath,"r") as record:
                old_election_names: list[str] = json.loads(record.read())
                for every_name in old_election_names:
                    self.election_list[every_name] = election_from_json_file(every_name,self,self.isolator_token)
        
    
    
    #The late phase is when and only when every voter-visible election has simultaneously
    # reached its threshold, or is already over
    def late_phase(self):
        all_opened: bool = True
        for every_election in self.election_list:
            actual_election = self.election_list[every_election]
            all_opened = all_opened and (actual_election.done_flushing() or actual_election.election_done)

        return json.dumps(all_opened)
    
    def register_election(self,election_name: str, threshold: str, control_keys: str):
        self.election_list[election_name] = Election(election_name,threshold,self,self.isolator_token)
        self.election_list[election_name].register_keyset(control_keys)
        with open(self.datapath,"w") as record:
            record.write(json.dumps(list(self.election_list.keys())))
            
    def request_auth_token(self, election_name: str, control_address: str)->str:
        try:
            print(f"Election name in election list is {election_name in self.election_list}")
            return self.election_list[election_name].request_auth_token(control_address)
        except:
            return "Malformed request"

    def download_history(self, election_name: str, control_address: str, auth_token: str)->str:
        try:
            return self.election_list[election_name].download_history(control_address,auth_token)
        except:
            return "Malformed Request"
    
    def submit_voter_transaction(self,election_name: str, control_address: str,transaction: str , auth_token: str)->str:
        try:
            #Insert code here to unlock the blockchain in case the late phase has started
            return self.election_list[election_name].submit_voter_transaction(control_address,transaction,auth_token)
        except:
            return "Malformed Request"

    def get_history_signature_length(self, election_name: str, control_address: str, auth_token: str)->str:
        try:
            return self.election_list[election_name].get_history_signature_length(control_address, auth_token)
        except:
            return "Malformed Request"

    def get_history_tx_length(self, election_name: str, control_address: str, auth_token: str)-> str:
        try:
            return self.election_list[election_name].get_history_tx_length(control_address,auth_token)
        except:
            return "Malformed Request"
    
    def ea_post_transaction(self, election_name: str, control_address: str, transaction: str):
        self.election_list[election_name].ea_post_transaction(control_address, transaction)
    
    #Idea: If it will take less than 10 seconds to finish flushing,
    #Then lock up the election mechanism
    def force_flush(self, election_name: str):
        self.election_list[election_name].flush()
    
    def done_flushing(self, election_name: str)->bool:
        return self.election_list[election_name].done_flushing()
    
    def late_phase_imminent(self, checking_name: str)->bool:
        #Begin with the assumption that every other election has already reached the late phase or is done
        almost_late_phase: bool = True
        #return False
        for election_name,every_election in self.election_list.items():
            #Check only other elections
            if election_name != checking_name:
                almost_late_phase = almost_late_phase and (every_election.election_done or every_election.done_flushing())

        return almost_late_phase
    
