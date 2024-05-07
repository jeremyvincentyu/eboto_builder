import {TextField, Grid, Button, Card} from "@mui/material"
import {DataGrid, GridColDef,GridRowModesModel} from '@mui/x-data-grid'
import {useState, MutableRefObject} from 'react'
import { Web3, Contract, Web3BaseWallet, Web3BaseWalletAccount, ContractAbi } from 'web3'
import BackBar from "./BackBar"

interface CandidateRow{
    id: number,
    full_name: string,
    role: string
}

function CandidateCard({rows}:{rows:CandidateRow[]}){
    //const [rows,setRows] = useState([])
    const [rowModesModel] = useState<GridRowModesModel>({})
    const columns: GridColDef[] = [
        {field:'id', headerName: "#",width: 30},
        {field: "full_name", headerName: "Full Name",width: 200},
        {field: "role", headerName: "Role", width: 200}
    ]

    return (
    <Card elevation = {8} style = {{padding: "1em"}} >
        <DataGrid
        rows={rows}
        rowModesModel={rowModesModel}
        columns={columns}
        initialState={{
        pagination:{
        paginationModel: {page:0, pageSize: 15}
        }
        }}
        pageSizeOptions ={[15]}

        />
    </Card>
    )
}

interface PackedWallet{
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface NewCardInterface{
selected_election: MutableRefObject<string>,
rows: CandidateRow[],
setRows: (newRows:(oldRows: CandidateRow[])=>CandidateRow[])=>void,
ethereum_wallet: MutableRefObject<PackedWallet>
}

function NewCard({selected_election, rows, setRows, ethereum_wallet}:NewCardInterface){
    const [newCandidateRole,setnewCandidateRole] = useState("")
    const [newCandidateName, setnewCandidateName] = useState("")

    async function addNewCandidateBackend(){
    const ea_address= ethereum_wallet.current.account[0].address
    await ethereum_wallet.current.contract.methods.addCandidatetoElection(newCandidateRole,selected_election.current, newCandidateName, rows.length).send({from: ea_address, gasPrice:"0"})
    }

    const addNewCandidate = ()=>{
    addNewCandidateBackend().then(()=>{
    setRows((old_rows)=>{
        return [...old_rows,{id: old_rows.length, full_name: newCandidateName, role: newCandidateRole}]
    })
    }
    )
    }

    return (
    <Card elevation = {8} style = {{padding: "1em"}} >

    <Grid container rowSpacing={5}>

    <Grid item xs={12}>
    <TextField label="Role" value={newCandidateRole} onChange={(e)=>setnewCandidateRole(e.target.value)}/>
    </Grid>

    <Grid item xs={12}>
    <TextField label="Name" value={newCandidateName} onChange={(e)=>setnewCandidateName(e.target.value)}/>
    </Grid>

    <Grid item xs={12}>
    <Button variant="contained" onClick={addNewCandidate}> Add Candidate </Button>
    </Grid>

    </Grid>

    </Card>
    )
}



export default function AddCandidateUI({selected_election,ethereum_wallet,rows,setRows}: NewCardInterface){
    //const [rows, setRows] = useState([]);
    return (
        <Grid container columnSpacing={20} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/add_candidate.png")`,
            backgroundRepeat: "no-repeat",
        }}>
        <BackBar back_function={()=>{window.location.href="#/modify_election"}} authority_bar={true}/>
        <Grid item xs= {6}>
        <CandidateCard rows={rows}/>
        </Grid>

        <Grid item xs={6}>
        <NewCard selected_election={selected_election} rows={rows} setRows={setRows} ethereum_wallet={ethereum_wallet}/>
        </Grid>

        </Grid>
    )
}
