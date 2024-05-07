from web3.contract.contract import Contract
from web3.types import TxParams,Wei
from eth_crypto import encrypt
from secrets import randbits
from hashlib import sha256
import json
class Voter:
    def __init__(self, address: str, pubkey: str, contract: Contract, election_name: str):
        self.address = address
        self.pubkey = pubkey
        self.contract = contract
        self.election_name = election_name

    def assign_control_key(self):
        salt_base = randbits(256)
        salt = sha256(str(salt_base).encode()).hexdigest()
        salted_key = json.dumps({"election_key":self.control_key,"salt":salt})
        encrypted_key = encrypt(self.pubkey,salted_key)
        self.contract.functions.assign_control_key(self.address,encrypted_key,self.election_name).transact(TxParams({"gasPrice": Wei(0)}))
    
    def authorize_control_address(self):
        self.contract.functions.authorize_control_address(self.election_name,self.control_address).transact(TxParams({"gasPrice": Wei(0)}))

    def allocate_control_key(self, control_key: str, control_address: str):
        self.control_key = control_key
        self.control_address = control_address
