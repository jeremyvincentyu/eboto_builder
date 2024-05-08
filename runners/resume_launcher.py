import subprocess
from threading import Thread

#Eliminate any gunicorn instances taking up ports 5000 and 5001
all_process_subprocess = subprocess.run("ps aux".split(),text=True,capture_output=True)
all_process_string = all_process_subprocess.stdout
all_processes = all_process_string.split("\n")

for every_process in all_processes:
    if "127.0.0.1:5001" in every_process or "127.0.0.1:5000" in every_process:
        pid = every_process.split()[1]
        subprocess.run(f"kill -SIGKILL {pid}".split())

#Get the passwords
geth_password = input("Enter password for geth and clef").strip()


#Start the geth environment in another thread
def geth_function():
    subprocess.run("python3 eboto_builder/runners/run_geth.py".split(), input = geth_password, text=True)

geth_thread = Thread(target = geth_function)
geth_thread.start()

#Start the isolator daemon in another thread
def isolator():
    subprocess.run("bash eboto_builder/runners/isolator.sh".split())

isolator_thread = Thread(target=isolator)
isolator_thread.start()

def authority():
    subprocess.run("bash eboto_builder/runners/authority.sh".split())

authority_thread = Thread(target=authority)
authority_thread.start()