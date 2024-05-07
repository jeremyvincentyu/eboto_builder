from flask import Flask,request
from election_index import ElectionIndex
from secrets import randbits
from eth_crypto import encrypt,private2public,decrypt
import json
import requests
app = Flask(__name__)
election_list: ElectionIndex = ElectionIndex()

isolator_token = str(randbits(256))
master_token = str(randbits(256))

print(f"Master token is {master_token}")

with open("data/authority.json","r") as keyfile:
    keyfile_object: dict[str,str] = json.loads(keyfile.read()) 
    private_key = keyfile_object["private"]
    public_key = private2public(private_key)

#Get the isolator control token
encrypted_challenge_token:str = requests.get(f"http://127.0.0.1/get_master_token").text
isolator_control_token = decrypt(private_key,encrypted_challenge_token)
requests.post("http://127.0.0.1/set_isolator_token",json={"challenge_token": isolator_control_token, "isolator_token":isolator_token})

encrypted_master_token = encrypt(public_key,master_token)

@app.route("/get_authority_token")
def get_authority_token():
    return encrypted_master_token

#This should only be sent from the EA Account
@app.route("/store_dates/<election_name>",methods=["POST"])
def store_dates(election_name: str):
    try:
        if request.get_json()["token"] != master_token:
            return "Not the EA"
        election_list.change_election_dates(election_name,request)    
        return "Dates Stored"
    except:
        return "Malformed Request"

#This should only be sent from the EA Account
@app.route("/get_dates/<election_name>", methods=["POST"])
def get_dates(election_name: str):
    try:
        if request.get_json()["token"] != master_token:
            return "Not the EA"
        return election_list.read_election_data(election_name)
    except:
        return "Malformed Request"

#This should only be sent from the EA Account
@app.route("/force_end_election/<election_name>",methods=["POST"])
def force_end_election(election_name: str):
    try:
        #print("Force end election triggered")
        #print(f"In the request: {request.get_json()}")
        if request.get_json()["token"] != master_token:
            return "Not the EA"
        election_list.force_end(election_name)
        return "Election Ended"
    except:
        return "Malformed Request"


#This should only be sent from the isolator
@app.route("/sign_transaction",methods=["POST"])
def sign_transaction():
    try:
        parameters = request.get_json()
        election_name = parameters["election_name"]
        if parameters["isolator_token"] != isolator_token:
            return "Not the isolator"
        transaction_to_sign = parameters["transaction_to_sign"]
        return election_list.sign_transaction(election_name,transaction_to_sign)
    except:
        return "Malformed Request"
    
#This should only be sent from the isolator
@app.route("/push_signature",methods=["POST"])
def push_signature():
    global election_list
    try:
        parameters = request.get_json()
        if parameters["isolator_token"] != isolator_token:
            return "Not the isolator"
        signature = parameters["signature"]
        control_address = parameters["control_address"]
        election_name = parameters["election_name"]
        election_list.push_signature(election_name,control_address,signature)
        return "Done"
    except:
        return "Malformed Request"