import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import { MutableRefObject } from 'react'
import check_blockchain_available from './blockchain_available'

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

export async function get_public_key(ethereum_wallet: MutableRefObject<PackedWallet>){
    const blockchain_available = await check_blockchain_available()
    if (blockchain_available){
        const ea_pubkey: string = await ethereum_wallet.current.contract.methods.getAuthorityPubkey().call()
        return ea_pubkey
    }
    else{
        const ea_pubkey_response: Response = await fetch("/get_authority_pubkey")
        const ea_pubkey = await ea_pubkey_response.text()
        return ea_pubkey
    }
}