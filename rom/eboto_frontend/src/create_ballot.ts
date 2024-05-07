import { MutableRefObject } from "react"
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import EthCrypto from 'eth-crypto'
import post_body from "./post_body"
import check_blockchain_available from "./blockchain_available"
import { get_authentication_token } from "./auth_token"


interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface ContractHistory {
    transactions: string[],
    signatures: string[],
    encrypted_ea_height: string
}

function random_string_index(array_length: number) {
    return String(Math.floor(Math.random() * array_length))
}
async function encrypt_transaction(private_key: string, plain_transaction: string) {
    const public_key = EthCrypto.publicKeyByPrivateKey(private_key)
    const encrypted_object = await EthCrypto.encryptWithPublicKey(public_key, plain_transaction)
    const condensed_object = EthCrypto.cipher.stringify(encrypted_object)
    return condensed_object
}

export async function create_ballot(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string, marker: string, marker_array_length: number, raw_ballot: Map<string, string>) {
    const transaction_object = new Map<string, string>()
    const private_key = ethereum_wallet.current.account[1].privateKey

    transaction_object.set("transaction_type", "3")
    transaction_object.set("marker", marker)
    if (marker_array_length > 0) {
        transaction_object.set("swap1", random_string_index(marker_array_length))
        transaction_object.set("swap2", random_string_index(marker_array_length))
    }
    else {
        transaction_object.set("swap1", "0")
        transaction_object.set("swap2", "0")
    }

    for (const [candidate_id, voted] of raw_ballot.entries()) {
        transaction_object.set(candidate_id, voted)
    }

    const object_transaction = Object.fromEntries(transaction_object)
    console.log("About to serialize")
    const plain_transaction: string = JSON.stringify(object_transaction)
    //console.log(`Casting poll ${plain_transaction}`)
    const transaction = await encrypt_transaction(private_key, plain_transaction)
    const control_address = ethereum_wallet.current.account[1].address
    let blockchain_available = await check_blockchain_available()
    if (blockchain_available) {
        //Start by getting the current signature length and current history length
        let current_signature_length = Number(await ethereum_wallet.current.contract.methods.getHistorySignatureLength(election_name).call({ from: control_address }))
        const current_history_length = Number(await ethereum_wallet.current.contract.methods.getHistoryTransactionLength(election_name).call({ from: control_address }))

        //The correct situation is that the signature length is as long as the history length.
        //If the signature length becomes longer than the history length, throw an error
        if (current_signature_length > current_history_length) {
            console.log(`Invariant violated for voter ${control_address}, signature length of ${current_signature_length} is larger than history length of ${current_history_length}`)
        }
        //If the signature length has not reached the history length, block until it is
        else if (current_signature_length < current_history_length) {
            while (current_signature_length < current_history_length) {
                current_signature_length = Number(await ethereum_wallet.current.contract.methods.getHistorySignatureLength(election_name).call({ from: control_address }))
            }
        }
        console.log(`Current signature length is ${current_signature_length}`)
        //Execute the transaction
        await ethereum_wallet.current.contract.methods.submit_voter_transaction(election_name, transaction).send({ from: control_address, gasPrice: "0" })

        //Then, block until the signature length increases by 1
        let new_signature_length = Number(await ethereum_wallet.current.contract.methods.getHistorySignatureLength(election_name).call({ from: control_address }))
        console.log(`Signature length is now ${new_signature_length}`)
        while (new_signature_length !== current_signature_length + 1) {
            new_signature_length = Number(await ethereum_wallet.current.contract.methods.getHistorySignatureLength(election_name).call({ from: control_address }))
            console.log(`Signature length is now ${new_signature_length}`)
        }
        console.log(`Broke out of siganture blocking loop`)
        //Get the very last signature and return it to the caller
        //Start by downloading the voter's history
        const my_history: ContractHistory = await ethereum_wallet.current.contract.methods.download_history(election_name).call({ from: control_address })

        //Then just get the last item
        const all_signatures = my_history.signatures
        const latest_signature = all_signatures[all_signatures.length - 1]
        console.log("About to return")
        return { plain_transaction: object_transaction, signature: latest_signature, encrypted: transaction }
    }

    else {
        const auth_token = await get_authentication_token(private_key, election_name, control_address)
        const body = JSON.stringify({ election_name, control_address, auth_token, transaction })
        const signature_response = await fetch("/submit_voter_transaction", post_body(body))
        const actual_signature = await signature_response.text()
        //
        
        //Check if the returned signature is actually a wait instruction
        if (actual_signature === "Wait" || actual_signature.includes("<html>")) {
            //If it is, keep checking until the late phase starts
            while (!blockchain_available) {
                blockchain_available = await check_blockchain_available()
            }
            //At which point, call this function again, this time being sure that blockchain mode will be used
            return await create_ballot(ethereum_wallet, election_name, marker, marker_array_length, raw_ballot)
        }


        return { plain_transaction: object_transaction, signature: actual_signature, encrypted: transaction }
    }
}