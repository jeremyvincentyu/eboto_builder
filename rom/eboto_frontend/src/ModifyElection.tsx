import { Button, Card, Grid } from "@mui/material"
import { MutableRefObject } from "react"
import { Web3, Contract, Web3BaseWallet, Web3BaseWalletAccount, ContractAbi } from 'web3'
import dayjs, { Dayjs } from 'dayjs'
import EthCrypto from 'eth-crypto'
import post_body from "./post_body"
import BackBar from "./BackBar"

interface VoterRow {
    id: number,
    full_name: string,
    eth_address: string,
    pubkey: string,
    elections_joined: string[]
}

interface CandidateRow {
    id: number,
    full_name: string,
    role: string
}

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface SelectiveVoterRow {
    id: number,
    ethereum_address: string,
    full_name: string,
    selected: boolean,
    rerender: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}

interface ModifyElectionInterface {
    selected_election: MutableRefObject<string>,
    setCandidateList: (newRow: (oldRow: CandidateRow[]) => CandidateRow[]) => void,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    voterDatabase: VoterRow[],
    setSelectiveVoterDatabase: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void,
    setStartDate: (new_date: Dayjs | null) => void,
    setEndDate: (new_date: Dayjs | null) => void,
}

interface ContractCandidate {
    id: number,
    name: string,
    role: string
}
export default function ModifyElectionUI({ selected_election, setCandidateList, ethereum_wallet, voterDatabase, setSelectiveVoterDatabase, setStartDate, setEndDate }: ModifyElectionInterface) {

    async function fill_candidate_table() {
        const candidate_rows: CandidateRow[] = []
        const candidate_ids: bigint[] = await ethereum_wallet.current.contract.methods.getCandidates(selected_election.current).call()
        for (let counter = 0; counter < candidate_ids.length; counter++) {
            const candidate_data: ContractCandidate = await ethereum_wallet.current.contract.methods.getCandidateData(selected_election.current, candidate_ids[counter]).call()
            candidate_rows.push({
                id: Number(candidate_data.id),
                full_name: candidate_data.name,
                role: candidate_data.role
            })
        }
        setCandidateList(() => { return candidate_rows; })
    }

    function add_candidate() {
        fill_candidate_table().then(() => {
            window.location.href = "#/add_candidate"
        }
        )
    }
    function edit_positions() {
        fill_candidate_table().then(() => {
            window.location.href = "#/edit_positions"
        }
        )
    }

    interface ElectionDate {
        start_Date_string: string,
        end_Date_string: string
    }

    async function edit_duration() {
        //Get an authentication token from the authority daemon
        const encrypted_auth_response: Response = await fetch("/get_authority_token")
        const encrypted_auth_packed: string = await encrypted_auth_response.text()
        const encrypted_auth_object = EthCrypto.cipher.parse(encrypted_auth_packed)
        const private_key = ethereum_wallet.current.account[0].privateKey
        const decrypted_auth_token = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_auth_object)
        console.log("Trying to get election dates")
        const election_date_response = await fetch(`get_dates/${selected_election.current}`,
            post_body(JSON.stringify({ "token": decrypted_auth_token }))
        )
        console.log("Election Date Fetching Done")
        const election_date_object: ElectionDate = await election_date_response.json()
        setStartDate(dayjs(election_date_object.start_Date_string))
        setEndDate(dayjs(election_date_object.end_Date_string))
        window.location.href = "#/edit_duration"
    }

    function edit_participation() {
        const selective_rows: SelectiveVoterRow[] = []
        for (let counter = 0; counter < voterDatabase.length; counter++) {
            const current_row = voterDatabase[counter]
            console.log()
            selective_rows.push({
                id: current_row.id,
                ethereum_address: current_row.eth_address,
                full_name: current_row.full_name,
                selected: current_row.elections_joined.includes(selected_election.current),
                rerender: setSelectiveVoterDatabase
            }
            )

        }

        setSelectiveVoterDatabase(() => { return selective_rows })
        window.location.href = "#/edit_participation"
    }

    return (
        <Card elevation={8} style={{ padding: "1em" }} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/modify.png")`,
            backgroundRepeat: "no-repeat",
            alignItems: "stretch",
            justifyContent: "center",
            display: "flex"
        }}>
            <BackBar back_function={()=>{window.location.href="#/ea_select_election"}} authority_bar={true}/>
            <Grid container rowSpacing={3}>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={add_candidate}> Add Candidates </Button>
                </Grid>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={edit_positions}> Edit Positions </Button>
                </Grid>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={edit_duration}> Election Duration </Button>
                </Grid>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={edit_participation}> Edit Voters </Button>
                </Grid>

            </Grid>
        </Card>
    )

}
