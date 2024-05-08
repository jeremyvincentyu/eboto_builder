#Create the Runtime logger directory
python3 -m venv eboto_runtime/logger

#Copy data from the ROM into the poa runtime
rsync -urv eboto_builder/rom/logger/ eboto_runtime/logger/

#Install Python Dependencies
cd eboto_runtime/logger
source bin/activate
pip install -r requirements.txt

#Setup the necessary subdirectories
mkdir eboto_runtime/logger/data