import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import { MutableRefObject } from 'react'
import check_blockchain_available from './blockchain_available'
import { get_authentication_token } from './auth_token'
import download_candidates from './download_candidates'
import EthCrypto from 'eth-crypto'
import post_body from './post_body'

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
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

export async function add_marker(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string, marker: string, marker_array_length: number) {
    const transaction_object = new Map<string, string>()
    const private_key = ethereum_wallet.current.account[1].privateKey

    transaction_object.set("transaction_type", "0")
    transaction_object.set("marker", marker)
    if (marker_array_length > 0) {
        transaction_object.set("swap1", random_string_index(marker_array_length))
        transaction_object.set("swap2", random_string_index(marker_array_length))
    }
    else {
        transaction_object.set("swap1", "0")
        transaction_object.set("swap2", "0")
    }
    
    const candidates_by_role = await download_candidates(ethereum_wallet, election_name)
    for (const [, candidates] of candidates_by_role.entries()) {
        const chosen_candidate_index = Number(random_string_index(candidates.length))
        const chosen_candidate = candidates[chosen_candidate_index]

        for (const candidate of candidates) {
            if (candidate.id === chosen_candidate.id) { transaction_object.set(String(candidate.id), "1") }
            else {
                transaction_object.set(String(candidate.id), "0")
            }
        }
    }

    const plain_transaction: string = JSON.stringify(Object.fromEntries(transaction_object))
    console.log(`Plain Transaction is ${plain_transaction}`)
    const transaction = await encrypt_transaction(private_key, plain_transaction)
    console.log(`Encrypted transaction is ${transaction}`)
    const control_address = ethereum_wallet.current.account[1].address
    let blockchain_available = await check_blockchain_available()
    if (blockchain_available) {

        await ethereum_wallet.current.contract.methods.submit_voter_transaction(election_name, transaction).send({ from: control_address, gasPrice: "0" })
    }
    else {
        const auth_token = await get_authentication_token(private_key, election_name, control_address)
        const body = JSON.stringify({ election_name, control_address, auth_token, transaction })
        const isolator_response = await fetch("/submit_voter_transaction", post_body(body))
        const isolator_status = await isolator_response.text()
        if (isolator_status === "Wait"){
            while (!blockchain_available){
                blockchain_available = await check_blockchain_available()
            }
            await add_marker(ethereum_wallet,election_name, marker, marker_array_length)
        }
    }
}

export async function swap_markers(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string, marker_array: string[],swap1: number, swap2: number) {
    const transaction_object = new Map<string, string>()
    const private_key = ethereum_wallet.current.account[1].privateKey
    
    const random_marker_index = Number(random_string_index(marker_array.length))
    const marker = marker_array[random_marker_index]
    

    transaction_object.set("transaction_type", "1")
    transaction_object.set("marker", marker)
    
    //Randomly reverse the swapping positions, so that swaps appear to be just as random as the election authority's
    let swap_1 = swap1
    let swap_2 = swap2


    if (Math.random()<0.5){
        swap_1 = swap2
        swap_2 = swap1
    }
    transaction_object.set("swap1",String(swap_1))
    transaction_object.set("swap2",String(swap_2))

    const candidates_by_role = await download_candidates(ethereum_wallet, election_name)
    for (const [, candidates] of candidates_by_role.entries()) {
        const chosen_candidate_index = Number(random_string_index(candidates.length))
        const chosen_candidate = candidates[chosen_candidate_index]

        for (const candidate of candidates) {
            if (candidate.id === chosen_candidate.id) { transaction_object.set(String(candidate.id), "1") }
            else {
                transaction_object.set(String(candidate.id), "0")
            }
        }
    }

    const plain_transaction: string = JSON.stringify(Object.fromEntries(transaction_object))
    const transaction = await encrypt_transaction(private_key, plain_transaction)
    const control_address = ethereum_wallet.current.account[1].address
    let blockchain_available = await check_blockchain_available()
    if (blockchain_available) {

        await ethereum_wallet.current.contract.methods.submit_voter_transaction(election_name, transaction).send({ from: control_address, gasPrice: "0" })
    }
    else {
        const auth_token = await get_authentication_token(private_key, election_name, control_address)
        const body = JSON.stringify({ election_name, control_address, auth_token, transaction })
        const isolator_response = await fetch("/submit_voter_transaction", post_body(body))
        const isolator_status = await isolator_response.text()
        if (isolator_status === "Wait"){
            while (!blockchain_available){
            blockchain_available = await check_blockchain_available()
            }
            await swap_markers(ethereum_wallet, election_name, marker_array, swap1, swap2)
        }
    }

}

export async function revoke_marker(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string, marker: string, marker_array_length: number) {
    const transaction_object = new Map<string, string>()
    const private_key = ethereum_wallet.current.account[1].privateKey

    transaction_object.set("transaction_type", "2")
    transaction_object.set("marker", marker)
    if (marker_array_length > 0) {
        transaction_object.set("swap1", random_string_index(marker_array_length))
        transaction_object.set("swap2", random_string_index(marker_array_length))
    }
    else {
        transaction_object.set("swap1", "0")
        transaction_object.set("swap2", "0")
    }
    
    const candidates_by_role = await download_candidates(ethereum_wallet, election_name)
    for (const [, candidates] of candidates_by_role.entries()) {
        const chosen_candidate_index = Number(random_string_index(candidates.length))
        const chosen_candidate = candidates[chosen_candidate_index]

        for (const candidate of candidates) {
            if (candidate.id === chosen_candidate.id) { transaction_object.set(String(candidate.id), "1") }
            else {
                transaction_object.set(String(candidate.id), "0")
            }
        }
    }

    const plain_transaction: string = JSON.stringify(Object.fromEntries(transaction_object))
    const transaction = await encrypt_transaction(private_key, plain_transaction)
    const control_address = ethereum_wallet.current.account[1].address
    let blockchain_available = await check_blockchain_available()
    if (blockchain_available) {

        await ethereum_wallet.current.contract.methods.submit_voter_transaction(election_name, transaction).send({ from: control_address, gasPrice: "0" })
    }
    else {
        const auth_token = await get_authentication_token(private_key, election_name, control_address)
        const body = JSON.stringify({ election_name, control_address, auth_token, transaction })
        const isolator_response = await fetch("/submit_voter_transaction", post_body(body))
        const isolator_status = await isolator_response.text()
        if (isolator_status === "Wait"){
            while (!blockchain_available){
            blockchain_available = await check_blockchain_available()
            }
            await revoke_marker(ethereum_wallet,election_name, marker, marker_array_length)
        }
    }
}