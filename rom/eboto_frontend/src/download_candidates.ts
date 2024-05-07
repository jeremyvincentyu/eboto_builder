import check_blockchain_available from "./blockchain_available";
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import { MutableRefObject } from 'react'
import post_body from "./post_body";
interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}
interface ContractCandidate {
    id: number,
    name: string,
    role: string
}
export default async function download_candidates(ethereum_wallet: MutableRefObject<PackedWallet>, election_name: string) {
    const blockchain_available = await check_blockchain_available()
    const candidates_by_role = new Map<string, ContractCandidate[]>()
    if (blockchain_available) {
        const candidate_ids: bigint[] = await ethereum_wallet.current.contract.methods.getCandidates(election_name).call()
        for (const candidate_id of candidate_ids) {
            const candidate_data: ContractCandidate = await ethereum_wallet.current.contract.methods.getCandidateData(election_name, candidate_id).call()
            const processed_candidate_data: ContractCandidate = {
                id: Number(candidate_data.id),
                name: candidate_data.name,
                role: candidate_data.role
            }
            if (!candidates_by_role.has(candidate_data.role)) { candidates_by_role.set(candidate_data.role, []) }
            const candidates_in_role = candidates_by_role.get(candidate_data.role)
            if (typeof candidates_in_role !== "undefined") {
                candidates_in_role.push(processed_candidate_data)
            }
        }
    }
    else {
        const postbody = JSON.stringify({ actual_name: election_name })
        const candidate_ids_response: Response = await fetch("/get_candidates", post_body(postbody))
        const candidate_ids: number[] = await candidate_ids_response.json()
        for (let counter = 0; counter < candidate_ids.length; counter++) {
            const candidate_id = candidate_ids[counter]
            const body = JSON.stringify({ election_name, candidate_id })
            const candidate_response: Response = await fetch("/get_candidate_data", post_body(body))
            const candidate_data: ContractCandidate = await candidate_response.json()
            if (!candidates_by_role.has(candidate_data.role)) { candidates_by_role.set(candidate_data.role, []) }
            const candidates_in_role = candidates_by_role.get(candidate_data.role)
            if (typeof candidates_in_role !== "undefined") {
                candidates_in_role.push(candidate_data)
            }
        }
    }
    return candidates_by_role
}