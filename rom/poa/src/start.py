import subprocess
from os import system
from eth_crypto import generate_keypair
from hashlib import sha256
import json

#system("pwd")
#Assume that the starting directory is the poa root, and that this command is being run as python3 src/

system("rm -rf clef && rm -rf data")
password = input("Geth Signer Account Password")
account_creation_command = "geth --datadir data account new"
account_creation_process = subprocess.run(account_creation_command.split(),capture_output=True,text=True,input=f"{password}\n{password}")
all_creation_lines = account_creation_process.stdout.split("\n")

for every_line in all_creation_lines:
    if "Public address of the key" in every_line:
        line_words=every_line.split()
        identified_with_prefix = line_words[-1].strip()
        identified_signer = identified_with_prefix[2:]
        #print(f"Identified address is {identified_address}")
        with open("src/template.json","r") as genesis_template:
            genesis_contents = genesis_template.read()
            template_signer = "7F7B7Ce1f344BC99C6c9F0bD7F6FA8BF0977C4a3"
            template_dispenser = "6b6411Cd2831A3074e23b42dd954529558F1C26a"
            dispenser_string = generate_keypair()
            dispenser_keypair = json.loads(dispenser_string)
            dispenser_address = dispenser_keypair["address"][2:]         
            
            with open("dispenser.json","w") as dispenser_file:
                dispenser_file.write(dispenser_string)

            new_genesis_contents = genesis_contents.replace(template_signer,identified_signer)
            new_genesis_contents = new_genesis_contents.replace(template_dispenser,dispenser_address)

            with open("genesis.json","w") as genesis_file:
                genesis_file.write(new_genesis_contents)

            with open("run.sh","w") as runner_file:
                #Run Command before integrating Clef
                #run_command = f"geth --datadir data --networkid 12345 --unlock {identified_with_prefix} --mine --miner.etherbase={identified_with_prefix}"

                #Run command after integrating Clef
                run_command = f"geth --datadir data --networkid 12345 --signer ./clef/clef.ipc --mine --miner.etherbase={identified_with_prefix} --http --http.port 8545 --http.corsdomain \"*\"" 
                runner_file.write(run_command)
            
            system("geth init --datadir data genesis.json")
            clef_init = f"clef --keystore data/keystore --configdir ./clef --chainid 12345 --suppress-bootwarn init"
            subprocess.run(clef_init.split(),input=f"{password}\n{password}",text=True)
            print("Clef init done")
            clef_store_key = f"clef --keystore data/keystore --configdir ./clef --chainid 12345 --suppress-bootwarn setpw {identified_with_prefix}"
            subprocess.run(clef_store_key.split(),input=f"{password}\n{password}\n{password}",text=True)
            with open("src/rules.js","rb") as rule_file:
                rules_hash = sha256(rule_file.read()).hexdigest()
            clef_attest = f"clef --keystore data/keystore --configdir ./clef --chainid 12345 --suppress-bootwarn  attest  {rules_hash}"
            subprocess.run(clef_attest.split(),input=password,text=True)