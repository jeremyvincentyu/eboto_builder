import { Button, Card, Grid, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { SelectChangeEvent } from '@mui/material/Select'
import { MutableRefObject } from "react"
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import download_and_interpret_history from "./interpret_history"
import { create_ballot } from "./create_ballot"
import EthCrypto from "eth-crypto"
import { get_public_key } from "./get_public_key"
import BackBar from "./BackBar"

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface SingleRoleInterface {
    roleWithChoices: RolewithChoices,
    setRolesWithChoices: (newRolesWithChoices: (oldRolesWithChoices: RolewithChoices[]) => RolewithChoices[]) => void
}

function SingleRow({ roleWithChoices, setRolesWithChoices }: SingleRoleInterface) {

    function candidate_to_menu_item(some_choice: ContractCandidate) {
        return (
            <MenuItem value={some_choice.id}>
                {some_choice.name}
            </MenuItem>
        )

    }

    function chooseCandidate(event: SelectChangeEvent) {
        const chosen_candidate_id = event.target.value
        setRolesWithChoices(
            (oldRoleswithChoices: RolewithChoices[]) => {
                const new_roles_with_choices: RolewithChoices[] = []
                for (const some_role_with_choices of oldRoleswithChoices) {
                    if (roleWithChoices.role !== some_role_with_choices.role) { new_roles_with_choices.push(some_role_with_choices) }
                    else {
                        new_roles_with_choices.push(
                            {
                                role: roleWithChoices.role,
                                choices: roleWithChoices.choices,
                                choice: Number(chosen_candidate_id)
                            }
                        )
                    }
                }
                return new_roles_with_choices
            }
        )
    }


    return (

        <Grid container columnSpacing={10}>

            <Grid item xs={4}>
                <Typography variant="h6" component="h6">
                    {roleWithChoices.role}
                </Typography>
            </Grid>

            <Grid item xs={8}>
                <FormControl fullWidth>
                    <InputLabel id={`Select_${roleWithChoices.role}`}> {roleWithChoices.role}</InputLabel>
                    <Select labelId={`Select_${roleWithChoices.role}`} value={String(roleWithChoices.choice)} onChange={chooseCandidate}>
                        {roleWithChoices.choices.map(candidate_to_menu_item)}
                    </Select>
                </FormControl>
            </Grid>

        </Grid>


    )
}

interface BallotCardInterface {
    rolesWithChoices: RolewithChoices[],
    setRolesWithChoices: (newRolesWithChoices: (oldRolesWithChoices: RolewithChoices[]) => RolewithChoices[]) => void
}





function BallotCard({ rolesWithChoices, setRolesWithChoices }: BallotCardInterface) {
    function make_row(roleWithChoices: RolewithChoices) {
        return (
            <Grid item xs={12}>
                <SingleRow roleWithChoices={roleWithChoices} setRolesWithChoices={setRolesWithChoices} />
            </Grid>
        )
    }

    return (
        <Card elevation={8} sx={{ padding: "1em" }}>
            <Grid container rowSpacing={5}>
                {rolesWithChoices.map(make_row)}
            </Grid>
        </Card>
    )
}


interface ContractCandidate {
    id: number,
    name: string,
    role: string
}

interface RolewithChoices {
    role: string,
    choices: ContractCandidate[],
    choice: number
}

interface BallotScreenInterface {
    ethereum_wallet: MutableRefObject<PackedWallet>,
    selected_election: MutableRefObject<string>,
    selected_marker: MutableRefObject<string>,
    rolesWithChoices: RolewithChoices[],
    setRolesWithChoices: (newRolesWithChoices: (oldRolesWithChoices: RolewithChoices[]) => RolewithChoices[]) => void,
    ticket_contents: MutableRefObject<string>

}

export default function BallotScreenUI({ ethereum_wallet, selected_election, selected_marker, rolesWithChoices, setRolesWithChoices, ticket_contents }: BallotScreenInterface) {

    async function cast_vote() {
        //Gather the Results and Marker
        const candidate_votes = new Map<string, string>()
        const active_marker = selected_marker.current
        for (const role of rolesWithChoices) {
            for (const candidate of role.choices) {
                if (candidate.id === role.choice) {
                    candidate_votes.set(String(candidate.id), "1")
                }
                else {
                    candidate_votes.set(String(candidate.id), "0")
                }
            }
        }

        //Get a believable marker array length
        const marker_state = await download_and_interpret_history(ethereum_wallet, selected_election.current)
        const marker_array_length = marker_state.marker_array.length

        //Put them into the Poll Caster
        const ticket_essentials = await create_ballot(ethereum_wallet, selected_election.current, active_marker, marker_array_length, candidate_votes)

        //Require that the signature actually belongs to the EA

        const full_ticket = {
            candidates_by_role: rolesWithChoices,
            plaintext_transaction: ticket_essentials.plain_transaction,
            encrypted_transaction: ticket_essentials.encrypted,
            encrypted_transaction_hash: EthCrypto.hash.keccak256(ticket_essentials.encrypted),
            ea_signature: ticket_essentials.signature
        }
        console.log(ticket_essentials.signature)
        const recovered_public_key = EthCrypto.recoverPublicKey(ticket_essentials.signature, full_ticket.encrypted_transaction_hash)
        const known_public_key = await get_public_key(ethereum_wallet)
        ticket_contents.current = JSON.stringify(full_ticket, undefined, 4)

        if (recovered_public_key === known_public_key) {
            console.log("Verification Succeeded")
            window.location.href = "#/ticket_screen"
        }

        else {
            console.log("Veriication failed")
            console.log(`Recovered public key is ${recovered_public_key}, but known public key is ${known_public_key}`)
        }
    }

    return (
        <Grid container rowSpacing={15} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/ballot_screen.png")`,
            backgroundRepeat: "no-repeat",
            height: "40em"
        }}>
            <Grid item xs={12}>
            <BackBar back_function={()=>{window.location.href="#/cheater_screen"}} authority_bar={false}/>
            </Grid>

            <Grid item xs={12}>
                <Card>
                    <Grid container>
                        <Grid item xs={12}>
                            <Typography variant="h4" component="h4">
                                Select Candidates
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <BallotCard rolesWithChoices={rolesWithChoices} setRolesWithChoices={setRolesWithChoices} />
                        </Grid>
                    </Grid>
                </Card>
            </Grid>

            <Grid item xs={12} md={12}>
                <Button variant="contained" onClick={cast_vote}>
                    Vote
                </Button>
            </Grid>

        </Grid>
    )
}
