#flask --app src/authority.py run --debug
export PYTHONPATH=$PYTHONPATH:src
python3 -m gunicorn -w 1 authority:app -b 127.0.0.1:5000 --log-level debug