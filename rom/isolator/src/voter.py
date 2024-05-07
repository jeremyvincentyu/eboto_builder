from secrets import randbits
from eth_crypto import encrypt, private2public
from collections import deque
from web3 import Web3, Account
from web3.middleware.signing import construct_sign_and_send_raw_middleware
from web3.middleware.geth_poa import geth_poa_middleware
from web3.types import TxParams,Wei
from threading import Thread,Lock
from os import path
from hashlib import sha256
import requests
import json



class Voter:
    def __init__(self, keypair: dict[str,str], election_name: str, isolator_token: list[str]):
        self.address = keypair["address"]
        self.transaction_history: list[str] = []
        self.tx_history_deque: deque[str] = deque()
        self.transaction_lock = Lock()
        self.signature_lock = Lock()
        self.signature_history: list[str] = []
        self.signature_history_deque: deque[str] = deque()
        self.voter_acted = False
        self.auth_token = str(randbits(256))
        self.private_key = keypair["private"]
        self.public_key = private2public(self.private_key)
        self.encrypted_token = encrypt(self.public_key,self.auth_token)
        self.isolator_token = isolator_token
        self.election_name = election_name
        self.web3_instance = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
        self.web3_instance.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.voter_account = Account.from_key(self.private_key)
        self.web3_instance.eth.default_account = self.voter_account.address
        self.web3_instance.middleware_onion.add(construct_sign_and_send_raw_middleware(self.voter_account))
        self.flusher_thread = Thread(target=self.flush)
        self.first_flush_done = False
        with open("src/deployed_addresses.json","r") as address_file:
            address_object: dict[str,str] = json.loads(address_file.read())
            actual_address  = self.web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
            with open("src/EA_Account.json","r") as abi_file:
                actual_abi = json.loads(abi_file.read())
                self.contract= self.web3_instance.eth.contract(address=actual_address,abi=actual_abi)
        #Check if a file already exiss for this voter
        folder_name = sha256(election_name.encode()).hexdigest()
        election_folder = f"data/elections/{folder_name}"
        voter_file_path = f"{election_folder}/{self.address}.json"
        if path.exists(voter_file_path):
            ##If so, copy the histories back into both the lists and the deques
            with open(voter_file_path, "r") as voter_file:
                flattened_voter: dict[str,list[str]] = json.loads(voter_file.read())
                self.transaction_history = flattened_voter["transaction_history"]
                self.signature_history= flattened_voter["signature_history"]
                
                for every_transaction in self.transaction_history:
                    self.enqueue_transaction(every_transaction)
                
                for every_signature in self.signature_history:
                    self.enqueue_signature(every_signature)


    def save_voter_history(self):
        folder_name = sha256(self.election_name.encode()).hexdigest()
        election_folder = f"data/elections/{folder_name}"
        voter_file_path = f"{election_folder}/{self.address}.json"
        with open(voter_file_path, "w") as voter_file:
            flattened_voter: dict[str,list[str]] = {
            "transaction_history":self.transaction_history,
            "signature_history":self.signature_history
            }
            voter_file.write(json.dumps(flattened_voter))

    def count_remaining_transactions(self):
        return len(self.signature_history_deque)
    
    def start_flushing(self):
        self.flusher_thread.start()

    def flush(self):
        while len(self.signature_history_deque) > 0 or len(self.tx_history_deque)>0:
            if len(self.tx_history_deque)>0:
                self.dequeue_transaction()
            if len(self.signature_history_deque) > 0:
                self.dequeue_signature()
        self.first_flush_done = True
    
    def enqueue_transaction(self, transaction: str):
        self.transaction_lock.acquire()
        self.tx_history_deque.append(transaction)
        self.transaction_lock.release()
   
    def dequeue_transaction(self):
        self.transaction_lock.acquire()
        transaction =self.tx_history_deque.popleft()
        print(f"Now flushing transaction: {transaction}")
        self.contract.functions.submit_voter_transaction(self.election_name,transaction).transact(TxParams({"gasPrice": Wei(0)}))
        self.transaction_lock.release()

    def enqueue_signature(self, signature: str):
        self.signature_lock.acquire()
        self.signature_history_deque.append(signature)
        self.signature_lock.release()

    def dequeue_signature(self):
        self.signature_lock.acquire()
        signature = self.signature_history_deque.popleft()
        print(f"Now flushing signature: {signature}")
        body = {"signature": signature,
                "control_address": self.address,
                "election_name": self.election_name,
                "isolator_token": self.isolator_token[0]                       
        }
        requests.post("http://127.0.0.1/push_signature",json=body)
        self.signature_lock.release()

    def ea_post_transaction(self, transaction: str):
        self.transaction_history.append(transaction)
        self.enqueue_transaction(transaction)
        body = {"isolator_token": self.isolator_token[0],
                "transaction_to_sign": transaction,
                "election_name" : self.election_name
                }
        response = requests.post(f"http://127.0.0.1/sign_transaction", json=body)
        signature: str = response.text
        self.signature_history.append(signature)
        self.enqueue_signature(signature)
        self.save_voter_history()

    def request_auth_token(self):
        return self.encrypted_token
    
    def voter_post_transaction(self, transaction: str, auth_token: str):
        #Require that the correct token is supplied, else, this is unauthorized
        if auth_token != self.auth_token:
            return "Unauthorized"
        
        #Append the voter's transaction to history
        #print(f"Appending {transaction} to history")
        self.transaction_history.append(transaction)
        self.enqueue_transaction(transaction)
        self.voter_acted = True
        body = {"isolator_token": self.isolator_token[0], "transaction_to_sign": transaction, "election_name": self.election_name}
        response = requests.post("http://127.0.0.1/sign_transaction", json=body)
        signature: str = response.text
        self.signature_history.append(signature)
        self.enqueue_signature(signature)
        #Flush the transactions immediately if the Election-triggered flushing is already done
        if self.first_flush_done:
            self.flush()
        self.save_voter_history()
        return signature

    
    def download_history(self, auth_token: str)->str:
        #Reject unauthorized access
        if auth_token != self.auth_token:
            return "Unauthorized"
        
        return json.dumps(self.transaction_history)
    
    def get_history_signature_length(self, auth_token: str)->str:
        #Reject unauthorized access
        if auth_token != self.auth_token:
            return "Unauthorized"
        
        return str(len(self.signature_history))
    
    def get_history_tx_length(self, auth_token: str)->str:
        #Reject unauthorized access
        if auth_token != self.auth_token:
            return "Unauthorized"
        
        return str(len(self.transaction_history))
