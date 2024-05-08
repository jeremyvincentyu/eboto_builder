#Root directory is the super-directory containing both eboto_builder and eboto_runtime
#Resync rom/poa/src with eboto_runtime/poa/src
rsync -urv eboto_builder/rom/poa/ eboto_runtime/poa
cd eboto_runtime/poa
python3 src/start.py