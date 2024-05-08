#flask --app src/isolator run --debug -p 5001
export PYTHONPATH=$PYTHONPATH:src
python3 -m gunicorn -w 1 isolator:app -b 127.0.0.1:5001 --log-level debug