import {Card,Grid,Button,Checkbox,FormControlLabel,FormGroup} from '@mui/material'
import {DataGrid, GridColDef, GridToolbarContainer, GridRenderCellParams } from '@mui/x-data-grid'
import {useState, ChangeEvent, MutableRefObject} from 'react'
import {Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount} from 'web3'
import BackBar from './BackBar'

interface SelectiveVoterRow{
 id: number,
 ethereum_address: string,
 full_name: string,
 selected: boolean,
 rerender: (newRows: (oldRows: SelectiveVoterRow[])=>SelectiveVoterRow[])=> void
}

function SelectVoter(props: GridRenderCellParams){
    return(
   <Checkbox checked={props.row.selected} onChange={
        ()=>{
        props.row.rerender(
        (old: SelectiveVoterRow[])=>{
            const new_rows: SelectiveVoterRow[] = []
            for (let counter=0;counter<old.length;counter++){
            if (counter != props.row.id){new_rows.push(old[counter])}
            else{
                const old_entry = old[counter]
                const new_entry = {
                id: old_entry.id,
                ethereum_address: old_entry.ethereum_address,
                full_name:old_entry.full_name,
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

interface SelectToolbarProps{
setSelectiveVoterDatabase: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[])=>void
}


function SelectAllBar(props: SelectToolbarProps){
const { setSelectiveVoterDatabase } = props;
const [all_selected,set_all_selected] = useState(false)
const toggleAll = (event: ChangeEvent<HTMLInputElement>) =>{
        set_all_selected(event.target.checked)
        setSelectiveVoterDatabase(
        (old)=>{
        const new_rows = []
        for (let counter=0;counter<old.length;counter++){
        const old_entry = old[counter]
        const new_entry = {id: old_entry.id,
                         ethereum_address: old_entry.ethereum_address,
                        full_name:old_entry.full_name,
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
    control={<Checkbox checked={all_selected} onChange={toggleAll}/>}
    />
    </FormGroup>
    </GridToolbarContainer>
)
}

interface VoterCardInterface{
selectiveVoterDatabase: SelectiveVoterRow[],
setSelectiveVoterDatabase: (newRows: (oldRows:SelectiveVoterRow[])=> SelectiveVoterRow[])=>void
}

function VoterCard({selectiveVoterDatabase,setSelectiveVoterDatabase}: VoterCardInterface){
    const columns: GridColDef[] =[
    {field: "id", headerName:"#", width: 20},
    {field: "ethereum_address", headerName:"Ethereum Address", width: 150
    },
    {field: "full_name", headerName: "Full Name", width: 150},
    {field: "participation", headerName: "Participation", width: 120, renderCell: SelectVoter}
    ]

return (
    <Card elevation={8} style = {{padding: "1em"}}>
    <DataGrid
    rows={selectiveVoterDatabase}
    columns={columns}
    initialState={{
        pagination:{
        paginationModel: {page:0, pageSize: 5}
        }
        }}
    pageSizeOptions ={[5]}
    slots = {{toolbar: SelectAllBar}}
    slotProps ={{
        toolbar: {setSelectiveVoterDatabase}
    }}
    />

    </Card>
)
}

interface PackedWallet{
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface VoterRow{
    id: number,
    full_name: string,
    eth_address: string,
    pubkey: string,
    elections_joined: string[]
}

interface EditParticipationInterface{
    ethereum_wallet: MutableRefObject<PackedWallet>,
    selected_election: MutableRefObject<string>,
    selectiveVoterDatabase: SelectiveVoterRow[],
    voter_list: VoterRow[],
    setVoterDatabase: (newVoterDatabase: (oldVoterDatabase: VoterRow[])=> VoterRow[])=> void,
    setSelectiveVoterDatabase: (newRows: (oldRows:SelectiveVoterRow[])=> SelectiveVoterRow[])=>void
}



export default function EditParticipationUI({ethereum_wallet, selected_election, selectiveVoterDatabase, setVoterDatabase, setSelectiveVoterDatabase,  voter_list}: EditParticipationInterface){

    async function commit_participation_change(){
    const ea_address = ethereum_wallet.current.account[0].address
    const new_voter_database: VoterRow[] = []
    for (let counter=0;counter<voter_list.length;counter++){
        const old_state = voter_list[counter]
        const new_state = selectiveVoterDatabase[counter]
        const voter_address = old_state.eth_address
        if (new_state.selected !== old_state.elections_joined.includes(selected_election.current)){
            await ethereum_wallet.current.contract.methods.ChangeParticipation(voter_address,selected_election.current,new_state.selected).send({from: ea_address,gasPrice:"0"})
            if (old_state.elections_joined.includes(selected_election.current)){
                new_voter_database.push({
                id: old_state.id,
                full_name: old_state.full_name,
                eth_address: old_state.eth_address,
                pubkey: old_state.pubkey,
                elections_joined: old_state.elections_joined.filter((election_name)=>election_name != selected_election.current)
                })
            }
            else{
                new_voter_database.push({
                id: old_state.id,
                full_name: old_state.full_name,
                eth_address: old_state.eth_address,
                pubkey: old_state.pubkey,
                elections_joined: [...old_state.elections_joined,selected_election.current]
                })
            }

        }
        else{
            new_voter_database.push(old_state)
        }
    }
    setVoterDatabase(()=>{return new_voter_database})
    }
    function commit_change(){
        commit_participation_change().then(()=>{
        window.location.href = "#/ea_dashboard"
        })
    }

    return (
    <Grid container rowSpacing={10} sx={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundImage: `url("images/edit_participation.png")`,
        backgroundRepeat: "no-repeat",
        alignItems: "stretch",
        justifyContent: "center",
        display: "flex"
    }}>
    <Grid item xs={12}>
        <BackBar back_function={()=>{window.location.href="#/modify_election"}} authority_bar={true}/>
    </Grid>
    <Grid item xs={12}>
    <VoterCard selectiveVoterDatabase={selectiveVoterDatabase}  setSelectiveVoterDatabase={setSelectiveVoterDatabase}/>
    </Grid>

    <Grid item xs={9}>
    </Grid>

    <Grid item xs={3}>
    <Button variant="contained" onClick={commit_change}>
    Submit
    </Button>
    </Grid>


    </Grid>
    )
}
