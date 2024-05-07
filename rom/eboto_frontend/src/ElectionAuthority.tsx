import { Box,Container, Typography, Grid, Button, Card } from "@mui/material"
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { MutableRefObject } from 'react'
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import EthCrypto from 'eth-crypto'
import BackBar from "./BackBar"
interface VoterRow {
    id: number,
    eth_address: string,
    pubkey: string,
    full_name: string,
    elections_joined: string[]
}

function VotersCard({ rows }: { rows: VoterRow[] }) {
    const columns: GridColDef[] = [
        { field: 'id', headerName: "#", width: 30 },
        { field: "eth_address", headerName: "Ethereum Address", width: 160 },
        { field: "full_name", headerName: "Full Name", width: 160 },
    ]




    return (
        <Card elevation={8} style={{ padding: "1em" }}>
            <Grid container>

                <Grid item xs={12}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 50 }
                            }
                        }}
                        pageSizeOptions={[50]}
                    />
                </Grid>


                <Grid item xs={12}>
                    <Typography component="h5" variant="h5">
                        Voter Accounts in Database
                    </Typography>
                </Grid>

            </Grid>
        </Card>
    )
}

interface SelectiveVoterRow {
    id: number,
    ethereum_address: string,
    full_name: string,
    selected: boolean,
    rerender: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}

interface Election {
    id: number,
    election_name: string,
    election_over: boolean,
    selected_election: MutableRefObject<string>,
    end_election: () => void
    view_election: () => void
}

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface ElectionResult {
    id: number,
    full_name: string,
    role: string,
    votes: number
}

interface ControlCardInterface {
    setStatusMessage: (newStatusMessage: string) => void,
    setSelectiveDB: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void,
    rows: VoterRow[],
    setElectionList: (newElections: (oldElections: Election[]) => Election[]) => void,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    selected_election: MutableRefObject<string>,
    setElectionResults: (newElectionResults: (oldElectionResults: ElectionResult[]) => ElectionResult[]) => void
}

interface ContractCandidate {
    id: number,
    name: string,
    role: string
}

function ControlCard({ setStatusMessage, setSelectiveDB, rows, setElectionList, ethereum_wallet, selected_election, setElectionResults }: ControlCardInterface) {
    async function force_end_election() {
        const encrypted_auth_response: Response = await fetch("/get_authority_token")
        const encrypted_auth_packed: string = await encrypted_auth_response.text()
        const encrypted_auth_object = EthCrypto.cipher.parse(encrypted_auth_packed)
        const private_key = ethereum_wallet.current.account[0].privateKey
        const decrypted_auth_token = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_auth_object)
        await fetch(`/force_end_election/${selected_election.current}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ "token": decrypted_auth_token })
        })
        await download_results()
    }

    async function download_results() {
        //console.log(`Downloading results for ${selected_election.current}`)
        const election_results: ElectionResult[] = []
        const all_candidates: bigint[] = await ethereum_wallet.current.contract.methods.getCandidates(selected_election.current).call()
        for (let counter = 0; counter < all_candidates.length; counter++) {
            const current_candidate_id = all_candidates[counter]
            const current_candidate: ContractCandidate = await ethereum_wallet.current.contract.methods.getCandidateData(selected_election.current, current_candidate_id).call()
            const current_candidate_votes: bigint = await ethereum_wallet.current.contract.methods.get_election_result(selected_election.current, current_candidate_id).call()
            election_results.push({
                id: Number(current_candidate_id),
                full_name: current_candidate.name,
                role: current_candidate.role,
                votes: Number(current_candidate_votes)
            })
        }
        setElectionResults(() => { return election_results })
    }

    async function fill_election_list() {
        const all_elections: string[] = await ethereum_wallet.current.contract.methods.getElectionList().call()
        const election_list: Election[] = []
        for (let counter = 0; counter < all_elections.length; counter++) {
            const election_name = all_elections[counter]
            //console.log(`Retrieved ${election_name}`)
            const election_over: boolean = await ethereum_wallet.current.contract.methods.is_election_over(election_name).call()
            const new_entry: Election = {
                id: counter,
                election_name,
                election_over,
                selected_election,
                end_election:
                    () => {
                        //console.log(`Stopping the ${selected_election.current} election`)
                        //This code executes when an election is forcibly ended
                        force_end_election().then(
                            () => { window.location.href = "#/view_results" }
                        )
                    },
                view_election:
                    () => {
                        download_results().then(
                            () => { window.location.href = "#/view_results" }
                        )
                    }
            }
            election_list.push(new_entry)
        }
        setElectionList(() => { return election_list })
    }

    function select_election() {
        fill_election_list().then(
            () => {
                window.location.href = "#/ea_select_election"
            }
        )
    }

    function add_selector(original_row: VoterRow) {
        //original: {id: number, eth_address: string, pubkey: string full_name: string}
        //selector: {id: 0, ethereum_address: 0, full_name: "Test Name", selected: test_state, setSelected: set_test_state}
        return {
            id: original_row.id,
            ethereum_address: original_row.eth_address,
            full_name: original_row.full_name,
            selected: false,
            rerender: setSelectiveDB
        }
    }

    function create_election() {

        const selective_rows = rows.map(add_selector)
        setSelectiveDB(() => { return selective_rows })
        setStatusMessage("")
        window.location.href = "#/create_election"
    }

    function enroll_voter() {

        window.location.href = "#/enroll_voter"
    }

    return (
        <Box>
            <Grid container rowSpacing={3}>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={select_election}>
                        Election Control
                    </Button>
                </Grid>

                <Grid item xs={12}>
                    <Button variant="contained" onClick={create_election}>
                        Create Election
                    </Button>
                </Grid>


                <Grid item xs={12}>
                    <Button variant="contained" onClick={enroll_voter}>
                        Edit Voters
                    </Button>
                </Grid>

            </Grid>
        </Box>
    )
}

function logout(ethereum_wallet: MutableRefObject<PackedWallet>) {
    ethereum_wallet.current.account.clear()
    window.location.href = "#/login"
}

interface ElectionAuthorityInterface {
    setStatusMessage: (newStatusMessage: string) => void,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    rows: VoterRow[],
    setSelectiveDB: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void,
    setElectionList: (newElections: (oldElections: Election[]) => Election[]) => void,
    selected_election: MutableRefObject<string>
    setElectionResults: (newElectionResults: (oldElectionResults: ElectionResult[]) => ElectionResult[]) => void
}
export default function ElectionAuthorityUI({ setStatusMessage, ethereum_wallet, rows, setSelectiveDB, setElectionList, selected_election, setElectionResults }: ElectionAuthorityInterface) {

    return (
        <Container sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/authority.png")`,
            backgroundRepeat: "no-repeat",
        }} maxWidth={false}>
            
            <Grid container spacing={5}>

                <Grid item xs={12}>
                <BackBar back_function={() => { logout(ethereum_wallet) }} authority_bar={true}/>
                </Grid>
                <Grid item xs={6}>
                    <VotersCard rows={rows} />
                </Grid>

                <Grid item xs={6}>
                    <ControlCard rows={rows} setStatusMessage={setStatusMessage} setSelectiveDB={setSelectiveDB} setElectionList={setElectionList} ethereum_wallet={ethereum_wallet} selected_election={selected_election} setElectionResults={setElectionResults} />
                </Grid>

            </Grid>
        </Container>
    )
}
