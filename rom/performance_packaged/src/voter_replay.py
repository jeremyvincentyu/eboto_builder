from eth_crypto import decrypt
import json

def add_marker(marker_array: list[str],revocation_list: list[str], transaction: dict[str,str]):
    #Retrieve the new marker from the transaction list
    new_marker = transaction["marker"]

    #Verify that this marker isn't in the revocation list and isn't in the marker array yet
    if (new_marker in marker_array) or (new_marker in revocation_list):
        return

    #Put the marker at the end of the marker array
    marker_array.append(new_marker)

def swap_markers(marker_array: list[str], transaction: dict[str,str]):
    swap_1 = int(transaction["swap1"])
    swap_2 = int(transaction["swap2"])

    #Check that both marker positions are in the marker array
    if not(0 <= swap_1 < len(marker_array) and 0 <= swap_2<len(marker_array)):
        return

    #Execute the swap    
    marker_array[swap_1],marker_array[swap_2] = marker_array[swap_2],marker_array[swap_1]

def revoke_marker(marker_array: list[str], revocation_list: list[str], transaction: dict[str,str]):
    marker = transaction["marker"]
    #Validate that the marker is inside the marker array
    if not marker in marker_array:
        return

    #Remove the marker from the marker array
    marker_array.remove(marker)

    #Add the marker to the revocation list
    revocation_list.append(marker)

def cast_poll(transaction: dict[str,str],candidate_ids: list[int])->dict[int,bool]:
    #Validation that the marker is the true and unrevoked marker
    #And that the kill marker was not used
    #Must be done in the caller
    results: dict[int,bool] ={}

    for every_id in candidate_ids:
        if transaction[str(every_id)] == "1":
            results[every_id] = True
        else:
            results[every_id] = False

    #Return the equivalent ballot
    return results

def replay_history(decryption_key: str, voter_history: list[str])->list[str]:
    #decrypted_ea_height means the length of the voter's history when the ea stopped manipulating it
    #Initialize variables that represent the voter's marker array and revoked marker list 
    marker_array: list[str] = []
    revocation_list: list[str] =[]

    #Begin By Simulating up to the EA's Decrypted_height
    for every_transaction in range(len(voter_history)):
        encrypted_transaction = voter_history[every_transaction]
        
        #Skip any transaction that fails decryption
        try:
            transaction_plaintext = decrypt(decryption_key,encrypted_transaction)
            decrypted_transaction: dict[str,str] = json.loads(transaction_plaintext)
            print(f"Now interpreting transaction {every_transaction}: {transaction_plaintext}")
        except:
            print(f"Failed to decrypt a transaction for {decryption_key}")
            continue
        
        transaction_type = decrypted_transaction["transaction_type"]
        
        #Transaction type 0 means to add a marker
        if transaction_type == "0":
            add_marker(marker_array,revocation_list,decrypted_transaction)
        
        #Transaction type 1 means to swap markers
        elif transaction_type == "1":
            swap_markers(marker_array,decrypted_transaction)

        #Transaction type 2 means to revoke a key
        elif transaction_type == "2":
            revoke_marker(marker_array,revocation_list,decrypted_transaction)
        #Transaction type 3 means to cast a poll
        #Ignore Poll transactions done by the EA
        elif transaction_type == "3": 
            continue
    
    #Return the marker array
    return marker_array