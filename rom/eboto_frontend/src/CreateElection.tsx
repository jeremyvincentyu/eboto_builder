import { TextField, Card, Grid, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material'
import { DataGrid, GridColDef, GridRowModesModel, GridRowsProp, GridRowModes, GridToolbarContainer, GridRenderCellParams } from '@mui/x-data-grid'
import { useState, ChangeEvent, MutableRefObject } from 'react'
import { DateTimePicker } from '@mui/x-date-pickers'
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import dayjs, { Dayjs } from 'dayjs'
import EthCrypto from 'eth-crypto'
import BackBar from './BackBar'

//Taken from MUI-X Documentation on CRUD DataGrid at mui.com/x/react-data-grid/editing
interface EditToolbarProps {
    setRows: (newRows: (oldrows: GridRowsProp) => GridRowsProp) => void;
    setRowModesModel: (
        newModel: (oldModel: GridRowModesModel) => GridRowModesModel
    ) => void;
    rows: { id: number, full_name: string, role: string }[]

}

function AddCandidateBar(props: EditToolbarProps) {
    const { setRows, setRowModesModel, rows } = props;

    const addNewCandidate = () => {
        const id = rows.length
        setRows((oldRows) => [...oldRows, { id, full_name: "", role: "" }])
        setRowModesModel((oldModel) => ({
            ...oldModel,
            [id]: { mode: GridRowModes.Edit, fieldToFocus: 'full_name' }

        })
        )
    }
    return (
        <GridToolbarContainer>
            <Button onClick={addNewCandidate}>Add New Candidate</Button>
        </GridToolbarContainer>
    )
}

interface CandidateRow {
    id: number,
    full_name: string,
    role: string
}

interface CandidateCardInterface {
    rows: CandidateRow[],
    setRows: (newRow: (oldRow: CandidateRow[]) => CandidateRow[]) => void
}

function CandidateCard({ rows, setRows }: CandidateCardInterface) {
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({})
    const columns: GridColDef[] = [
        { field: 'id', headerName: "#", width: 30, editable: true },
        { field: "full_name", headerName: "Full Name", width: 200, editable: true },
        { field: "role", headerName: "Role", width: 200, editable: true }
    ]


    return (

        <Card elevation={8} style={{ padding: "1em" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 5 }
                    }
                }}
                onCellEditStop={(params) => {
                    setRowModesModel(
                        { ...rowModesModel, [params.id]: { mode: GridRowModes.View } }
                    )
                }
                }
                rowModesModel={rowModesModel}
                pageSizeOptions={[5]}
                processRowUpdate={
                    (newRow) => {
                        //console.log(newRow)
                        const new_rows: CandidateRow[] = []
                        for (let counter = 0; counter < rows.length; counter++) {
                            if (rows[counter].id === newRow.id) { new_rows.push(newRow) }
                            else { new_rows.push(rows[counter]) }
                        }
                        setRows(() => { return new_rows; })
                        return newRow
                    }

                }

                slots={{ toolbar: AddCandidateBar }}
                slotProps={{
                    toolbar: { setRows, setRowModesModel, rows }
                }}
            />
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

function SelectVoter(props: GridRenderCellParams) {
    return (
        <Checkbox checked={props.row.selected} onChange={
            () => {
                props.row.rerender(
                    (old: SelectiveVoterRow[]) => {
                        const new_rows = []
                        for (let counter = 0; counter < old.length; counter++) {
                            if (counter != props.row.id) { new_rows.push(old[counter]) }
                            else {
                                const old_entry = old[counter]
                                const new_entry = {
                                    id: old_entry.id,
                                    ethereum_address: old_entry.ethereum_address,
                                    full_name: old_entry.full_name,
                                    selected: !old_entry.selected,
                                    rerender: old_entry.rerender
                                }
                                new_rows.push(new_entry)
                            }
                        }
                        return new_rows
                    }
                )
            }
        }
        />
    )
}




interface SelectToolbarProps {
    setRows: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}


function SelectAllBar(props: SelectToolbarProps) {
    const { setRows } = props;
    const [all_selected, set_all_selected] = useState(false)
    const toggleAll = (event: ChangeEvent<HTMLInputElement>) => {
        set_all_selected(event.target.checked)
        setRows(
            (old) => {
                const new_rows = []
                for (let counter = 0; counter < old.length; counter++) {
                    const old_entry = old[counter]
                    const new_entry = {
                        id: old_entry.id,
                        ethereum_address: old_entry.ethereum_address,
                        full_name: old_entry.full_name,
                        selected: !all_selected,
                        rerender: old_entry.rerender
                    }
                    new_rows.push(new_entry)
                }
                return new_rows
            }
        )
    }
    return (
        <GridToolbarContainer>
            <FormGroup>
                <FormControlLabel
                    label="Select All Voters"
                    control={<Checkbox checked={all_selected} onChange={toggleAll} />}
                />
            </FormGroup>
        </GridToolbarContainer>
    )
}


interface VoterCardInterface {
    rows: SelectiveVoterRow[],
    setRows: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}

function VoterCard({ rows, setRows }: VoterCardInterface) {
    const columns: GridColDef[] = [
        { field: "id", headerName: "#", width: 20 },
        {
            field: "ethereum_address", headerName: "Ethereum Address", width: 150
        },
        { field: "full_name", headerName: "Full Name", width: 150 },
        { field: "participation", headerName: "Participation", width: 120, renderCell: SelectVoter }
    ]

    return (
        <Card elevation={8} style={{ padding: "1em" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 5 }
                    }
                }}
                pageSizeOptions={[5]}
                slots={{ toolbar: SelectAllBar }}
                slotProps={{
                    toolbar: { setRows }
                }}
            />

        </Card>
    )
}

interface DateCardInterface {
    startDate: Dayjs | null,
    setStartDate: (new_date: Dayjs | null) => void,
    endDate: Dayjs | null,
    setEndDate: (new_date: Dayjs | null) => void
}

function DateCard({ startDate, setStartDate, endDate, setEndDate }: DateCardInterface) {
    return (
        <Card elevation={8} style={{ padding: "1em" }}>
            <Grid container rowSpacing={5} columnSpacing={30}>

                <Grid item xs={6}>
                    <DateTimePicker label="Start " value={startDate} onChange={(new_date) => { setStartDate(new_date) }} />
                </Grid>

                <Grid item xs={6}>
                    <DateTimePicker label="End" value={endDate} onChange={(new_date) => { setEndDate(new_date) }} />
                </Grid>


            </Grid>
        </Card>
    )
}

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface VoterRow {
    id: number,
    full_name: string,
    eth_address: string,
    pubkey: string,
    elections_joined: string[]
}

interface CreateElectionInterface {
    statusMessage: string,
    setStatusMessage: (newStatusMessage: string) => void,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    selectiveVoterDatabase: SelectiveVoterRow[],
    setVoterDatabase: (newVoterDatabase: (oldVoterDatabase: VoterRow[]) => VoterRow[]) => void,
    setSelectiveVoterDatabase: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}


export default function CreateElection({ statusMessage, setStatusMessage, ethereum_wallet, selectiveVoterDatabase, setVoterDatabase, setSelectiveVoterDatabase }: CreateElectionInterface) {
    const [electionName, setElectionName] = useState("")
    const [candidateRows, setCandidateRows] = useState<CandidateRow[]>([])
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs('1970-01-01T00:00'))
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs('1970-01-01T00:00'))

    async function commit_election() {
        const ea_address = ethereum_wallet.current.account[0].address
        //Get an authentication token from the authority daemon
        const encrypted_auth_response: Response = await fetch("/get_authority_token")
        const encrypted_auth_packed: string = await encrypted_auth_response.text()
        const encrypted_auth_object = EthCrypto.cipher.parse(encrypted_auth_packed)
        const private_key = ethereum_wallet.current.account[0].privateKey
        const decrypted_auth_token = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_auth_object)

        //Store the election Date Locally Later On
        //Ensure that the End Date is not older than the present date. If it is, update the status  message and return.
        if (endDate !== null) {
            const now = dayjs()
            if (endDate < now) {
                setStatusMessage("Cannot end election in the past!")
                return
            }
        }


        //Add the election
        await ethereum_wallet.current.contract.methods.createElection(electionName).send({ from: ea_address, gasPrice: "0" })

        //Add the candidates
        for (let counter = 0; counter < candidateRows.length; counter++) {
            const current_row = candidateRows[counter]
            //console.log(current_row)
            await ethereum_wallet.current.contract.methods.addCandidatetoElection(current_row.role, electionName, current_row.full_name, current_row.id).send({ from: ea_address, gasPrice: "0" })
        }

        //Add the voters

        for (let counter = 0; counter < selectiveVoterDatabase.length; counter++) {
            const current_selective_row = selectiveVoterDatabase[counter]
            await ethereum_wallet.current.contract.methods.ChangeParticipation(current_selective_row.ethereum_address, electionName, current_selective_row.selected).send({ from: ea_address, gasPrice: "0" })
            //If the voter is selected to be part of the election, set the voter database
        }

        setVoterDatabase(
            (oldVoterDatabase) => {
                const new_voter_database = []
                for (let counter = 0; counter < oldVoterDatabase.length; counter++) {
                    const corresponding_row = selectiveVoterDatabase[counter]
                    const current_row = { ...oldVoterDatabase[counter], elections_joined: [...oldVoterDatabase[counter].elections_joined] }
                    if (corresponding_row.selected) {
                        current_row.elections_joined.push(electionName)
                    }
                    new_voter_database.push(current_row)
                }
                return new_voter_database
            }

        )

        //Store the Dates in the Authority Daemon
        const start_Date_string = startDate?.toString()
        const end_Date_string = endDate?.toString()
        const body = JSON.stringify({ start_Date_string, end_Date_string, "token": decrypted_auth_token })
        console.log(`JSON Dates: ${body}`)
        await fetch(`/store_dates/${electionName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body
        })
        window.location.href = "#/ea_dashboard"





    }


    return (
        <Grid container rowSpacing={10} columnSpacing={20} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/create.png")`,
            backgroundRepeat: "no-repeat",
        }}>
            <Grid item xs={12}>
                <BackBar back_function={() => { window.location.href = "#/ea_dashboard" }} authority_bar={true} />
            </Grid>

            <Grid item xs={12}>
                <DateCard startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />
            </Grid>

            <Grid item xs={6}>
                <CandidateCard rows={candidateRows} setRows={setCandidateRows} />
            </Grid>

            <Grid item xs={6}>
                <VoterCard rows={selectiveVoterDatabase} setRows={setSelectiveVoterDatabase} />
            </Grid>
            <Grid item xs={12}>
                <Card>
                    <Grid container>

                        <Grid item xs={12}>
                            <Typography variant="body2" component="h6">
                                {statusMessage}
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField label="Election Name" value={electionName} onChange={(e) => setElectionName(e.target.value)} />
                        </Grid>

                        <Grid item xs={6}>
                            <Button variant="contained" onClick={commit_election}>Submit</Button>
                        </Grid>

                    </Grid>
                </Card>
            </Grid>
        </Grid>
    )

}
