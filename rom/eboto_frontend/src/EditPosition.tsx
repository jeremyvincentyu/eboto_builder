import {Card,Grid,Button} from '@mui/material'
import {DataGrid, GridColDef, GridRowModesModel, GridRowModes } from '@mui/x-data-grid'
import {useState, MutableRefObject} from 'react'
import {Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount} from 'web3'
import BackBar from './BackBar'

interface CandidateRow{
    id: number,
    full_name: string,
    role: string
}

interface CandidateCardInterface{
    rows: CandidateRow[],
    setRows: (newRow: (oldRow: CandidateRow[]) => CandidateRow[])=> void
}

function CandidateCard({rows,setRows}: CandidateCardInterface){
       const columns: GridColDef[] = [
        {field:'id',headerName: "#",width: 50},
        {field: "full_name", headerName: "Full Name",width: 200},
        {field: "role", headerName: "Role", width: 100, editable: true}
    ]
        const [rowModesModel,setRowModesModel] = useState<GridRowModesModel>({})

return(

<Card elevation={8} style = {{padding: "1em"}}>
        <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
        pagination:{
        paginationModel: {page:0, pageSize: 5}
        }
        }}
        rowModesModel={rowModesModel}
        pageSizeOptions ={[5]}
        processRowUpdate={
            (newRow)=>{
                //console.log(newRow)
                const new_rows: CandidateRow[] = []
                for (let counter=0;counter<rows.length;counter++){
                    if (rows[counter].id === newRow.id){new_rows.push(newRow)}
                    else{new_rows.push(rows[counter])}
                }
                setRows(()=>{return new_rows})
                return newRow
            }
        }
        onProcessRowUpdateError={
        (error)=>{console.log(error)}
        }
        onCellEditStop={(params)=>{
            setRowModesModel(
            {...rowModesModel,[params.id]:{mode: GridRowModes.View}}
            )
        }
        }
        />
</Card>

)
}

interface PackedWallet{
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface EditPositionInterface{
    selected_election: MutableRefObject<string>,
    rows: CandidateRow[],
    setRows: (newRow: (oldRow: CandidateRow[]) => CandidateRow[])=> void,
    ethereum_wallet: MutableRefObject<PackedWallet>
}

interface ContractCandidate{
        id: number,
        name: string,
        role: string
}

export default function  EditPositionUI({selected_election,rows,setRows,ethereum_wallet}: EditPositionInterface){

async function commit_changes(){
        const ea_address= ethereum_wallet.current.account[0].address
        for (let counter =0; counter < rows.length;counter++){
        const current_row = rows[counter]
        const candidate_id = current_row.id
        const candidate_info: ContractCandidate = await ethereum_wallet.current.contract.methods.getCandidateData(selected_election.current,candidate_id).call()
        if (candidate_info.role !== current_row.role){
                await ethereum_wallet.current.contract.methods.ChangeCandidateRole(candidate_id,current_row.role,selected_election.current).send({from: ea_address, gasPrice: "0"})
        }
        }
}

function submit_changes(){
        commit_changes().then(
        ()=>{
        window.location.href="#/ea_dashboard"
        }
        )
}

return (
<Grid container rowSpacing={5} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/edit_position.png")`,
            backgroundRepeat: "no-repeat",
        }}>
<Grid item xs={12}>
<BackBar back_function={()=>{window.location.href="#/modify_election"}} authority_bar={true}/>
</Grid>

<Grid item xs={12}>
<CandidateCard rows={rows} setRows={setRows}/>
</Grid>

<Grid item xs={9}>
</Grid>

<Grid item xs={3}>
<Button variant="contained" onClick={submit_changes}>
Submit
</Button>
</Grid>

</Grid>
)
}
