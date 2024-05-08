#Create the Runtime poa directory
python3 -m venv eboto_runtime/poa

#Copy data from the ROM into the poa runtime
rsync -urv eboto_builder/rom/poa/ eboto_runtime/poa/

#Install Python Dependencies
cd eboto_runtime/poa
source bin/activate
pip install -r requirements.txt

#Install the Javascript Dependencies
npm install

#Return to the superfolder
cd ..
cd ..

#Run the poa reset script
bash eboto_builder/rebuilders/reset_geth.sh