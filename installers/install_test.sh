#Create the runtime testing directory
python3 -m venv eboto_runtime/testing

#Copy data from the ROM into the poa runtime
rsync -urv eboto_builder/rom/testing/ eboto_runtime/testing/

#Install Python Dependencies
cd eboto_runtime/testing
source bin/activate
pip install -r requirements.txt

#Install the Javascript Dependencies
npm install

#Makeup the necessary subdirectories
mkdir data
mkdir data/private_keys