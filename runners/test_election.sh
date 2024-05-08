cd eboto_runtime/testing
source bin/activate
export PYTHONPATH=$PYTHONPATH:src
#First Command Line Argument is number of voters; second command line argument is name of election
python3 src/setup_election.py $1 $2