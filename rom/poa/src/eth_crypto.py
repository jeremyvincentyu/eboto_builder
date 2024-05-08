import subprocess

def generate_keypair()->str:
    generator_command = "node src/generate.js".split()
    generator_process=subprocess.run(generator_command, capture_output=True, text=True)
    return generator_process.stdout.split("\n")[1].strip()