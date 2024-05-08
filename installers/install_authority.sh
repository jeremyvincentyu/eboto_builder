#Create the Runtime Authority Daemon directory
python3 -m venv eboto_runtime/authority_daemon

#Copy data from the ROM into the poa runtime
rsync -urv eboto_builder/rom/authority_daemon/ eboto_runtime/authority_daemon/

#Install Python Dependencies
cd eboto_runtime/authority_daemon
source bin/activate
pip install -r requirements.txt

#Install the Javascript Dependencies
npm install

#Return to the superfolder
cd ..
cd ..

#Create the necesary subfolder structure for the isolator
mkdir eboto_runtime/authority_daemon/data
mkdir eboto_runtime/authority_daemon/data/control_keys
mkdir eboto_runtime/authority_daemon/data/dates
mkdir eboto_runtime/authority_daemon/data/roles