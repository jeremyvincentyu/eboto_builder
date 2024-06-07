#Create the Runtime Performance Directory
python3 -m venv eboto_runtime/performance

#Copy Data from the ROM into the Performance Runtime
rsync -urv eboto_builder/rom/performance_packaged/ eboto_runtime/performance/

#Install Python Dependencies
cd eboto_runtime/performance
source bin/activate
pip install -r requirements.txt

#Install Javascript dependencies
npm install .

#Setup the necessary subdirectories
mkdir data