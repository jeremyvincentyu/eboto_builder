from flask import Flask,request
from election_list import ElectionList
from eth_crypto import encrypt
from secrets import randbits
from web3.middleware.geth_poa import geth_poa_middleware
from web3 import Web3
import json

app = Flask(__name__)
master_token = str(randbits(256))

with open("data/ea_pubkey.json") as keyfile:
    ea_pubkey_object = json.loads(keyfile.read())
    ea_public_key = ea_pubkey_object["public"]

encrypted_master_token = encrypt(ea_public_key,master_token)
isolator_token: list[str] = []
election_list = ElectionList(isolator_token)
web3_instance = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
web3_instance.middleware_onion.inject(geth_poa_middleware, layer =0)

with open("src/deployed_addresses.json","r") as address_file:
    address_object: dict[str,str] = json.loads(address_file.read())
    actual_address  = web3_instance.to_checksum_address(address_object["eBoto#EA_Account"])
    with open("src/EA_Account.json","r") as abi_file:
        actual_abi = json.loads(abi_file.read())
        contract= web3_instance.eth.contract(address=actual_address,abi=actual_abi)


@app.route("/get_master_token")
def get_master_token():
    return encrypted_master_token

@app.route("/set_isolator_token",methods=["POST"])
def set_isolator_token():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        if parameters.get("challenge_token","") != master_token:
            return "Unauthorized"
        isolator_token.clear()
        isolator_token.append(parameters["isolator_token"])
        return "Done"
    except:
        return "Malformed Request"


#Register an election
@app.route("/register_election",methods=["POST"])
def register_election():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        #Ensure that it is actually the EA making this request
        if parameters.get("challenge_token","") != master_token:
            return "Unauthorized"
        election_name = parameters["election_name"]
        threshold = parameters["threshold"]
        control_keys =parameters["control_keys"]
        election_list.register_election(election_name,threshold,control_keys)
        return "Ok"
    except:
        return "Malformed Request"

@app.route("/force_flush",methods=["POST"])
def force_flush():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        if parameters.get("auth_token","") != master_token:
          return "Unauthorized"
        election_name = parameters["election_name"]
        election_list.force_flush(election_name)
        return "Ok"
    except:
        return "Malformed Request"

#Check if a particular election has already been flushed
#If the voter turnout is particularly low
@app.route("/done_flushing",methods=["POST"])
def done_flushing():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        if parameters.get("auth_token","") != master_token:
            return "Unauthorized"
        election_name = parameters["election_name"]
        return json.dumps(election_list.done_flushing(election_name))
    except:
        return "Malformed Request"


# The late phase is when and only when every voter-visible election has simultaneously
# reached its threshold
@app.route("/late_phase")
def late_phase():
    #return json.dumps(False)
    return election_list.late_phase()

@app.route("/request_auth_token",methods=["POST"])
def request_token():
    try:
        print(f"Request text is {request.get_data().decode()}")
        parameters:dict[str,str] =  request.get_json()
        print(f"Parameter type is {type(parameters)}")
        if type(parameters) != dict:
            print(f"Parameters sent are {parameters}")
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        control_address = parameters.get("control_address","")
        auth_token = election_list.request_auth_token(election_name,control_address)
        print(f"Returning crypted token {auth_token}")
        return auth_token
    except:
        print("Returning error message for requester")
        return "Malformed Request"

#Intercepted
@app.route("/download_history",methods = ["POST"])
def download_history():
    try:
        parameters:dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        control_address = parameters.get("control_address","")
        auth_token = parameters.get("auth_token","")
        return election_list.download_history(election_name, control_address, auth_token)
    except:
        return "Malformed Request"

#Intercepted
@app.route("/get_history_signature_length", methods=["POST"])
def get_history_signature_length():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        voter_address = parameters.get("voter_address","")
        auth_token = parameters.get("auth_token","")
        return election_list.get_history_signature_length(election_name, voter_address, auth_token)
    except:
        return "Malformed Request"

#Intercepted
@app.route("/get_history_tx_length", methods=["POST"])
def get_history_tx_length():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        voter_address = parameters.get("voter_address","")
        auth_token = parameters.get("auth_token","")
        return election_list.get_history_tx_length(election_name, voter_address, auth_token)
    except:
        return "Malformed Request"

#Intercepted
@app.route("/get_authority_pubkey")
def get_authority_pubkey():
    return ea_public_key

#Intercepted
@app.route("/submit_voter_transaction",methods=["POST"])
def submit_voter_transaction():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        voter_address = parameters.get("control_address","")
        auth_token = parameters.get("auth_token","")
        transaction = parameters.get("transaction","")
        #print(f"Received the transaction {transaction}")
        return election_list.submit_voter_transaction(election_name,voter_address,transaction,auth_token)
    except:
        return "Malformed Request"

#Intercepted
@app.route("/ea_post_transaction",methods=["POST"])
def ea_post_transaction():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters.get("election_name","")
        control_address = parameters.get("control_address","")
        auth_token = parameters.get("auth_token","")
        transaction = parameters.get("transaction","")
        if auth_token != master_token:
            #print("Reached Unauthorized Branch")
            return "Unauthorized"
        else:
            #print("Reached authorized branch")
            election_list.ea_post_transaction(election_name, control_address, transaction)
            return "Committed"
    except:
        return "Malformed Request"
    
#Pass-through
@app.route("/retrieve_control_key",methods=["POST"])
def retrieve_control_key():
    try:
        parameters: dict[str,str] = request.get_json()
        if type(parameters) != dict:
            return "Malformed Request"
        election_name = parameters["election_name"]
        voter_address = parameters["voter_address"]
        crypted_control_key = contract.functions.retrieve_control_key(election_name,voter_address).call()
        return crypted_control_key
    except:
        return "Malformed Request"

#Pass-through
@app.route("/check_voter_enrolled",methods=["POST"])
def check_voter_enrolled():
    try:
        address_object: dict[str,str] = request.get_json()
        if type(address_object) != dict:
            return "Malformed Request"
        actual_address = address_object.get("address","")
        voter_enrolled: bool=  contract.functions.check_voter_enrolled(actual_address).call()
        return json.dumps(voter_enrolled)
    except:
        return "Malformed Request"

#Pass-through
@app.route("/download_voter_elections",methods=["POST"])
def download_voter_elections():
    try:
        address_object: dict[str,str] = request.get_json()
        if type(address_object) != dict:
            return "Malformed Request"
        actual_address = address_object["address"]
        return json.dumps(contract.functions.downloadVoterElections(actual_address).call())
    except:
        return "Malformed Request"

#Pass-through
@app.route("/is_visible",methods=["POST"])
def is_visible():
    try:
        election_name_object: dict[str,str] = request.get_json()
        if type(address_object) != dict:
            return "Malformed Request"
        actual_name = election_name_object["actual_name"]
        is_visible: bool = contract.functions.is_visible(actual_name).call()
        return json.dumps(is_visible)
    except:
        return "Malformed Request"

#Pass-through
@app.route("/is_election_over",methods=["POST"])
def is_over():
    try:
        election_name_object = request.get_json() 
        actual_name = election_name_object["actual_name"]
        is_election_over: bool = contract.functions.is_election_over(actual_name).call()
        return json.dumps({"is_election_over": is_election_over})
    except:
        return "Malformed Request"

#Pass-through
@app.route("/get_candidates",methods=["POST"])
def get_candidates():
    try:
        election_name_object = request.get_json()
        actual_name = election_name_object["actual_name"]
        candidate_list: list[int] = contract.functions.getCandidates(actual_name).call()
        return json.dumps(candidate_list)
    except:
        return "Malformed Request"

#Pass-through
@app.route("/get_candidate_data",methods=["POST"])
def get_candidate_data():
    try:
        parameters = request.get_json()
        election_name = parameters["election_name"]
        candidate_id = int(parameters["candidate_id"])
        candidate_info: tuple[int, str, str] = contract.functions.getCandidateData(election_name,candidate_id).call()
        return json.dumps({"id": candidate_info[0],"name": candidate_info[1],"role": candidate_info[2]})
    except:
        return "Malformed Request"


#Pass-through
@app.route("/get_election_result",methods=["POST"])
def get_election_result():
    try:
        parameters = request.get_json()
        election_name = parameters["election_name"]
        candidate_id = parameters["candidate_id"]
        election_result: int = contract.functions.get_election_results(election_name,candidate_id).call()
        return json.dumps(election_result)
    except:
        return "Malformed Request"
