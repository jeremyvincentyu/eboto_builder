#Starts in the Superfolder of eboto_runtime and eboto_poa

#Recopy the contract from the rom into the runtime
rsync -urv eboto_builder/rom/poa/src/  eboto_runtime/poa/src/

#Enter the poa folder and activate the python environment
cd eboto_runtime/poa
source bin/activate

#Compile the smart contract
bash src/deploy.sh
cd ..

#Deploy the Smart Contract to the Geth Network
python3 poa/src/deploy.py

#After the abi and new deployed address have been recopied into the frontend, rebuild the frontend
cd eboto_frontend
bash publish.sh $1
