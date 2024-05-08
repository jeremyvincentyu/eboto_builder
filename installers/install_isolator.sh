#Create the Runtime Isolator directory
python3 -m venv eboto_runtime/isolator

#Copy data from the ROM into the poa runtime
rsync -urv eboto_builder/rom/isolator/ eboto_runtime/isolator/

#Install Python Dependencies
cd eboto_runtime/isolator
source bin/activate
pip install -r requirements.txt

#Install the Javascript Dependencies
npm install

#Return to the superfolder
cd ..
cd ..

#Create the necesary subfolder structure for the isolator
mkdir eboto_runtime/isolator/data
mkdir eboto_runtime/isolator/data/elections