import json
from eth_crypto import generate_keypair


def allocate_accounts(n: int, requesting_election: str)->list[dict[str,str]]:
    allocated_accounts: list[dict[str,str]] = []
    
    for _ in range(n):
        new_account = generate_keypair()
        keypair_object = json.loads(new_account)
        condensed = {"private": keypair_object["privateKey"],"address": keypair_object["address"]}
        allocated_accounts.append(condensed)
    
    
    with open(f"data/control_keys/{requesting_election}.json","w") as election_file:
        election_file.write(json.dumps(allocated_accounts))
    

    return allocated_accounts