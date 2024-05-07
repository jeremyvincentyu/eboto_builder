import { Typography, Grid, Button, FormControl, MenuItem, Select, InputLabel } from "@mui/material"
import EthCrypto from "eth-crypto"
import { useState, MutableRefObject } from "react"
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import { SelectChangeEvent } from "@mui/material/Select"
import check_blockchain_available from "./blockchain_available"
import post_body from "./post_body"
import download_and_interpret_history from "./interpret_history"
import BackBar from "./BackBar"

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

function logout(ethereum_wallet: MutableRefObject<PackedWallet>) {
    ethereum_wallet.current.account.clear()
    window.location.href = "#/login"
}

interface VotingKey {
    position: number,
    key: string
}

interface VoterSelectElectionInterface {
    setActiveKey: (new_key: string) => void,
    setStatusMessage: (newStatusMessage: string)=>void,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    voterElections: string[],
    selected_election: MutableRefObject<string>,
    setElectionResults: (newElectionResults: (oldElectionResults: ElectionResult[]) => ElectionResult[]) => void
    setVotingKeys: (newvotingKeys: (oldVotingKeys: VotingKey[]) => VotingKey[]) => void,
    revokedKeys: MutableRefObject<string[]>,
    selected_marker: MutableRefObject<string>

}

interface ElectionResult {
    id: number,
    full_name: string,
    role: string,
    votes: number
}

interface ContractCandidate {
    id: number,
    name: string,
    role: string
}

interface ElectionKey{
    election_key: string,
    salt: string
}

interface MarkerState{
    marker_array: string[],
    revocation_list: string[]
}

export default function VoterSelectElectionUI({ selected_marker, setStatusMessage, setActiveKey, ethereum_wallet, voterElections, selected_election, setElectionResults, setVotingKeys, revokedKeys }: VoterSelectElectionInterface) {
    const [election, setElection] = useState("")

    async function bifurcated_download_election_key() {
        const blockchain_available = await check_blockchain_available()
        const private_key = ethereum_wallet.current.account[0].privateKey
        const my_address = ethereum_wallet.current.account[0].address
        //If the blockchain is available, call using the walconst directly
        if (blockchain_available) {
            const encrypted_election_key: string = await ethereum_wallet.current.contract.methods.retrieve_control_key(election, my_address).call({ from: my_address })
            //console.log(`Encrypted Election Key(Direct): ${encrypted_election_key}`)
            if (encrypted_election_key.length > 0) {
                const encrypted_key_object = EthCrypto.cipher.parse(encrypted_election_key)
                const decrypted_key_object = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_key_object)
                const salted_key_object: ElectionKey = JSON.parse(decrypted_key_object)
                const election_key = salted_key_object.election_key
                while (ethereum_wallet.current.web3.eth.accounts.wallet.length > 1){
                    ethereum_wallet.current.web3.eth.accounts.wallet.remove(ethereum_wallet.current.web3.eth.accounts.wallet.length-1)
                }
                ethereum_wallet.current.account = ethereum_wallet.current.web3.eth.accounts.wallet.add(election_key)
                //console.log(ethereum_wallet.current.account)
            }
        }
        //If blockchain is not available, ask the isolation server using Fetch API
        else {
            const encrypted_election_key_response = await fetch("/retrieve_control_key", post_body(JSON.stringify(
                {
                    election_name: election,
                    voter_address: my_address
                }
            )
            )
            )
            const encrypted_election_key = await encrypted_election_key_response.text()
            //console.log(`Encrypted Election Key(Proxied): ${encrypted_election_key}`)
            if (encrypted_election_key.length>0){
            const encrypted_key_object = EthCrypto.cipher.parse(encrypted_election_key)
            const decrypted_key_object = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_key_object)
            //console.log(`Decrypted Key Object: ${decrypted_key_object}, of type ${typeof(decrypted_key_object)}`)
            //console.log(`Character 0 of Decrypted Key Object is ${decrypted_key_object[0]}`)
            const salted_key_object: ElectionKey = JSON.parse(decrypted_key_object)
            const election_key:string = salted_key_object.election_key
            //console.log(`Extracted Key:${election_key}`)

            //Ensure that there are no keys in the wallet other than the persistent key
            while (ethereum_wallet.current.web3.eth.accounts.wallet.length > 1){
                ethereum_wallet.current.web3.eth.accounts.wallet.remove(ethereum_wallet.current.web3.eth.accounts.wallet.length-1)
            }
            ethereum_wallet.current.account = ethereum_wallet.current.web3.eth.accounts.wallet.add(election_key)
            }
        }

         

        
    }

    async function download_results() {
        const blockchain_available = true
        if (blockchain_available) {
            const election_results: ElectionResult[] = []
            const all_candidates: bigint[] = await ethereum_wallet.current.contract.methods.getCandidates(selected_election.current).call()
            for (let counter = 0; counter < all_candidates.length; counter++) {
                const current_candidate_id = all_candidates[counter]
                const current_candidate: ContractCandidate = await ethereum_wallet.current.contract.methods.getCandidateData(selected_election.current, current_candidate_id).call()
                const current_candidate_votes: bigint = await ethereum_wallet.current.contract.methods.get_election_result(selected_election.current, current_candidate_id).call()
                election_results.push(
                    {
                        id: Number(current_candidate_id),
                        full_name: current_candidate.name,
                        role: current_candidate.role,
                        votes: Number(current_candidate_votes)
                    }
                )
            }
            setElectionResults(() => { return election_results; })
        }
    }
    
    async function check_election_status() {
        selected_election.current = election
        const election_over = await ethereum_wallet.current.contract.methods.is_election_over(selected_election.current).call()
        if (election_over) {
            await download_results()
            window.location.href = "#/voter_view_results"
        }
        else {
            await bifurcated_download_election_key()
            console.log("Successfully downloaded election key")
            //Once the election key has been downloaded, download the associated history and set the appropriate variables
            const marker_state: MarkerState = await download_and_interpret_history(ethereum_wallet,election)
            const marker_array = marker_state.marker_array
            const revocation_list = marker_state.revocation_list
            setVotingKeys(()=>{
                const new_voting_keys: VotingKey[] = []
                for (let counter = 0;counter < marker_array.length;counter++){
                    const current_marker = marker_array[counter]
                    new_voting_keys.push({position: counter, key:current_marker})
                }
                //console.log(`New Voting Keys are ${JSON.stringify(new_voting_keys)}`)
                return new_voting_keys
            })
            revokedKeys.current = revocation_list
            if (marker_array.length > 0){
                setActiveKey(marker_array[0])
                selected_marker.current = marker_array[0]
            }

            setStatusMessage("")
            window.location.href = "#/cheater_screen"
        }
    }

    function make_menu_item(election_name: string) {
        return (
            <MenuItem value={election_name} key={election_name}>{election_name} </MenuItem>
        )
    }

    function chooseElection(event: SelectChangeEvent) { setElection(event.target.value) }

    return (
        <Grid container rowSpacing={8} sx={{
            backgroundSize: "cover",
            backgroundPosition: "bottom",
            backgroundImage: `url("images/voter_select.png")`,
            backgroundRepeat: "no-repeat",
        }}>
            <Grid item xs={12}>
            <BackBar back_function={() => { logout(ethereum_wallet) }} authority_bar={false}/>
            </Grid>

            <Grid item xs={9}>
            </Grid>

            <Grid item xs={12}>
                <Typography variant="h3" component="h3">
                    Select an Election
                </Typography>
            </Grid>

            <Grid item xs={12}>
                <FormControl fullWidth>
                    <InputLabel id="Select_Election"> Select Election</InputLabel>
                    <Select labelId="Select_Election" value={election} onChange={chooseElection}>
                        {voterElections.map(make_menu_item)}
                    </Select>
                </FormControl>
            </Grid>

            <Grid item xs={12}>
                <Button variant="contained" onClick={check_election_status}>
                    Next
                </Button>


            </Grid>

        </Grid>
    )

}
