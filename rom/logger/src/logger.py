from flask import Flask,request
from secrets import randbits
from hashlib import sha256
import json
app = Flask(__name__)

@app.route("/submit_timelog",methods=["POST"])
def submit_timelog():
    time_data: dict[str,str] = request.get_json()
    if "address" in time_data:
        address = time_data["address"]
        file_name = sha256((address+str(randbits(64))).encode()).hexdigest()
        with open(f"data/{file_name}","w") as log_file:
            log_file.write(json.dumps(time_data))

    return ""