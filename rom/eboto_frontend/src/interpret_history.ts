import check_blockchain_available from "./blockchain_available"
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import {MutableRefObject} from 'react'
import EthCrypto from 'eth-crypto'
import post_body from "./post_body"
import { get_authentication_token } from './auth_token'

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface ContractHistory{
    transactions: string[],
    signatures: string[],
    encrypted_ea_height: string
}

interface Transaction{
    transaction_type: string,
    marker: string,
    swap1: string,
    swap2: string
}

async function decrypt_transaction(transaction: string, private_key: string){
    const transaction_object = EthCrypto.cipher.parse(transaction)
    const transaction_json = await EthCrypto.decryptWithPrivateKey(private_key,transaction_object)
    //console.log(`Transaction JSON: ${transaction_json}`)
    const decrypted_transaction: Transaction = JSON.parse(transaction_json)
    return decrypted_transaction

}

function execute_transaction(marker_array: string[], revocation_list: string[], decrypted_transaction: Transaction){
    const transaction_type  = decrypted_transaction.transaction_type
    const marker = decrypted_transaction.marker
    const swap_1 = Number(decrypted_transaction.swap1)
    const swap_2 = Number(decrypted_transaction.swap2)
    //Add
    if (transaction_type === "0"){marker_array.push(marker)}

    //Swap
    else if (transaction_type === "1"){
        const temporary = marker_array[swap_1]
        marker_array[swap_1] = marker_array[swap_2]
        marker_array[swap_2] = temporary
    }
    //Revoke
    else if (transaction_type == "2"){
        const marker_index = marker_array.findIndex((some_marker)=>marker===some_marker)
        marker_array.splice(marker_index,1)
        revocation_list.push(marker)

    }
}


export default async function download_and_interpret_history(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string){
        console.log("Started Interpreter")
        //console.log("After Starting interpreter")
        const blockchain_available = await check_blockchain_available()
        console.log("Finished checking Blockchain Availability")
        //If the blockchain is available, directly download the history
        const control_address = ethereum_wallet.current.account[1].address
        const private_key = ethereum_wallet.current.account[1].privateKey
        const marker_array: string[] = []
        const revocation_list: string[] = []
        if (blockchain_available){
            console.log("Blockchain is Available")
            const history: ContractHistory = await ethereum_wallet.current.contract.methods.download_history(election_name).call({from: control_address})
            console.log("Finished downloading history from blockchain")
            const transactions = history.transactions
            for (let counter = 0; counter < transactions.length;counter ++){
                const encrypted_transaction = transactions[counter]
                const decrypted_transaction = await decrypt_transaction(encrypted_transaction,private_key)
                execute_transaction(marker_array, revocation_list,decrypted_transaction)
            }
            return {marker_array, revocation_list}

        }
        //If the blockchain is not available, use the fetch api
        else {
            console.log("Blockchain Not Available")
            const auth_token = await get_authentication_token(private_key,election_name,control_address)
            console.log("Finished Getting Authentication token")
            //Download once the authentication token is received
            const historyResponse = await fetch("/download_history",post_body(JSON.stringify({election_name,control_address,auth_token})))
            console.log("Finished downloading history from proxy server")
            const transactions: string[] = await historyResponse.json()
            console.log("Finished decoding history from proxy server")
            //console.log("Finished Downloading Transactions")
            for (const encrypted_transaction of transactions){
                //console.log(`Before Decrypting Transaction ${encrypted_transaction}`)
                const decrypted_transaction = await decrypt_transaction(encrypted_transaction,private_key)
                //console.log(`After Decrypting Transaction`)
                execute_transaction(marker_array, revocation_list,decrypted_transaction)
            }
            return {marker_array, revocation_list}
        }
    }