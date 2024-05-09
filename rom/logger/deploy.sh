export PYTHONPATH=$PYTHONPATH:src
python3 -m gunicorn -w 1 logger:app -b 127.0.0.1:5002 --log-level debug