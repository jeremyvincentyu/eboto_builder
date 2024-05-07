import { Button, Grid, FormControl, Radio, RadioGroup, Typography, Card } from "@mui/material"
import { ChangeEvent, MutableRefObject } from 'react'
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { sha256 } from "js-sha256"
import download_and_interpret_history from "./interpret_history"
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import { add_marker, swap_markers, revoke_marker } from "./marker_manipulation"
import download_candidates from "./download_candidates"
import useMediaQuery from "@mui/material/useMediaQuery"
import { createTheme } from "@mui/material/styles"
import BackBar from "./BackBar"

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}


interface VotingKey {
    position: number,
    key: string
}

interface KeyRow {
    voting_key: VotingKey,
    setVotingKeys: (newRows: (oldRows: VotingKey[]) => VotingKey[]) => void,
    revokedKeys: MutableRefObject<string[]>
}

function SingleRow({ voting_key, setVotingKeys, revokedKeys }: KeyRow) {

    //Swaps with the voting key immediately underneath
    function swap_down() {
        setVotingKeys(
            (oldVotingKeys) => {
                //console.log(`Attempting to swap down, position is ${voting_key.position}, voting_key is ${voting_key.key}`)
                //Block the swap if already the last row
                if (voting_key.position === oldVotingKeys.length - 1) { return oldVotingKeys; }
                const new_rows: VotingKey[] = []


                //Take note of the positions and values involved in the swap
                //console.log("Attempting to Read voting_key.key")
                const my_own_key = voting_key.key
                //console.log("Attempting to Read key as position")
                const my_own_position = voting_key.position
                const other_position = my_own_position + 1
                //console.log("Attempting to access the other key")
                const other_key = oldVotingKeys[other_position].key
                //console.log("Starting Pusher Loop")
                for (let counter = 0; counter < oldVotingKeys.length; counter++) {
                    //Push something different if it is this row's old position
                    if (counter === my_own_position) { new_rows.push({ position: counter, key: other_key }) }

                    //Push something different if it is the other row's old position
                    else if (counter === other_position) { new_rows.push({ position: counter, key: my_own_key }) }

                    else { new_rows.push(oldVotingKeys[counter]) }
                }
                //console.log("Finished making the new rows array")
                return new_rows
            }
        )
    }

    //Swaps with the voting key immediately above
    function swap_up() {
        setVotingKeys(
            (oldVotingKeys) => {
                //Block the swap if already the top row
                if (voting_key.position === 0) { return oldVotingKeys; }
                const new_rows: VotingKey[] = []

                //Take note of the positions and values involved in the swap
                const my_own_key = voting_key.key
                const my_own_position = voting_key.position
                const other_position = my_own_position - 1
                const other_key = oldVotingKeys[other_position].key

                for (let counter = 0; counter < oldVotingKeys.length; counter++) {
                    //Push something different if it is this row's old position
                    if (counter === my_own_position) { new_rows.push({ position: counter, key: other_key }) }

                    //Push something different if it is the other row's old position
                    else if (counter === other_position) { new_rows.push({ position: counter, key: my_own_key }) }

                    else { new_rows.push(oldVotingKeys[counter]) }
                }
                return new_rows
            }
        )
    }

    function revoke() {
        const my_position = voting_key.position;
        const marker = voting_key.key
        setVotingKeys((oldVotingKeys) => {
            const new_rows: VotingKey[] = []
            //Push in everything before this row
            for (let row_counter = 0; row_counter < my_position; row_counter++) {
                new_rows.push({
                    position: row_counter,
                    key: oldVotingKeys[row_counter].key

                })
            }
            //Put the voting key associated with this row into the revocation list
            revokedKeys.current.push(marker)
            //Push in everything after this row
            if (my_position < oldVotingKeys.length - 1) {
                for (let row_counter = my_position + 1; row_counter < oldVotingKeys.length; row_counter++) {
                    new_rows.push({
                        position: row_counter - 1,
                        key: oldVotingKeys[row_counter].key
                    }
                    )
                }
            }
            return new_rows
        })
    }
    const theme = createTheme()
    const at_least_md = useMediaQuery(theme.breakpoints.up('md'))
    let key_representation = voting_key.key
    if (!at_least_md){
        key_representation = voting_key.key.slice(0,20) + "..."
    }
    return (
        <Grid container columnSpacing={{md: 5, xs:0.1}}>
            <Grid item md={1} xs={3} zeroMinWidth>
                <Radio value={voting_key.key} />
            </Grid>
            
            <Grid item md={1} xs={3} zeroMinWidth>
                <Button  startIcon={<DeleteOutlineIcon style={{color: "red"}}/>} onClick={revoke} />
            </Grid>
            
            <Grid item md={1} xs={3} zeroMinWidth>
                <Button  startIcon={<ArrowDownwardIcon />} onClick={swap_down} />
            </Grid>

            <Grid item md={1} xs={3} zeroMinWidth>
                <Button  startIcon={<ArrowUpwardIcon />} onClick={swap_up} />
            </Grid>



            <Grid item md={8} xs={12} zeroMinWidth>
                <Typography variant="body2" component="h6">
                    {key_representation}
                </Typography>
            </Grid>



        </Grid>
    )
}

interface KeyCardInterface {
    activeKey: string,
    setActiveKey: (new_key: string) => void,
    votingKeys: VotingKey[],
    setVotingKeys: (newvotingKeys: (oldVotingKeys: VotingKey[]) => VotingKey[]) => void,
    revokedKeys: MutableRefObject<string[]>
    selected_marker: MutableRefObject<string>
}

function KeyCard({ activeKey, setActiveKey, votingKeys, setVotingKeys, revokedKeys, selected_marker }: KeyCardInterface) {

    function make_row(some_key: VotingKey) {
        return (
            <SingleRow voting_key={some_key} setVotingKeys={setVotingKeys} revokedKeys={revokedKeys} />
        )
    }

    function guiSetActiveKey(event: ChangeEvent<HTMLInputElement>) {
        setActiveKey(event.target.value)
        selected_marker.current = event.target.value
    }

    return (
            <Card>
            <FormControl>
                <RadioGroup value={activeKey} onChange={guiSetActiveKey}>
                    {votingKeys.map(make_row)}
                </RadioGroup>
            </FormControl>
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
    choices: ContractCandidate[]
    choice: number
}

interface CheaterInterface {
    statusMessage: string,
    setStatusMessage: (newStatusMessage: string) => void,
    activeKey: string,
    setActiveKey: (new_key: string) => void,
    votingKeys: VotingKey[],
    setVotingKeys: (newvotingKeys: (oldVotingKeys: VotingKey[]) => VotingKey[]) => void,
    revokedKeys: MutableRefObject<string[]>,
    ethereum_wallet: MutableRefObject<PackedWallet>,
    selected_election: MutableRefObject<string>,
    selected_marker: MutableRefObject<string>,
    setRolesWithChoices: (newRolesWithChoices: (oldRolesWithChoices: RolewithChoices[]) => RolewithChoices[]) => void
}


export default function CheaterScreenUI({ statusMessage, setStatusMessage, activeKey, setActiveKey, votingKeys, setVotingKeys, revokedKeys, ethereum_wallet, selected_election, selected_marker, setRolesWithChoices }: CheaterInterface) {
    function extract_markers(voting_key: VotingKey) { return voting_key.key }

    async function switch_to_ballot_screen() {
        const candidates_by_role = await download_candidates(ethereum_wallet, selected_election.current)
        const roles_with_choices: RolewithChoices[] = []
        for (const [role, candidates] of candidates_by_role.entries()) {
            roles_with_choices.push({ role, choices: candidates, choice: -1 })
        }

        setRolesWithChoices(() => roles_with_choices)
        console.log(`Enterng Ballot Screen with Marker ${selected_marker.current}`)
        window.location.href = "#/ballot_screen"
    }

    async function add_key() {
        const newest_position = votingKeys.length
        const marker_base = new Uint32Array(8)
        crypto.getRandomValues(marker_base)
        let combined_string = ""
        for (let counter = 0; counter < 8; counter++) {
            combined_string += String(marker_base[counter])
        }

        let newest_marker: string = sha256(combined_string)
        //Keep Generating markers until one that is neither in the current marker array nor the revocation list is found
        while (votingKeys.map(extract_markers).includes(newest_marker) || revokedKeys.current.includes(newest_marker)) {
            crypto.getRandomValues(marker_base)
            combined_string = ""
            for (let counter = 0; counter < 8; counter++) {
                combined_string += String(marker_base[counter])
            }

            newest_marker = sha256(combined_string)
        }
        const new_rows = [...votingKeys, { position: newest_position, key: newest_marker }]
        setVotingKeys(() => new_rows)
    }

    async function commit_changes() {
        //Set the indicator to say that changes are being saved and voter should wait 
        setStatusMessage("Changes are being saved. Please wait and do not close this webpage.")

        //Goal: Identify a sequence of transactions that changes the old marker array into the new marker array
        //Look at position i in the old marker array; if the new marker array has the same element at position i, do nothing
        //If the new marker array has a different element y at the current position,
        //Then search the rest of the length of the old marker array for y.
        //If the old marker array has y, then swap y with the current element 
        //If the old marker array does not have y, append y to the old marker array and swap it into the current position
        //If the old marker array has no remaining elements at the scanning position and beyond, but the new marker array still has elements, then just copy elements from the new marker array
        //until the scratch array fills with the new marker array's elements
        //If the old marker array still has elements at teh scanning position and beyond,
        // but the new marker array is out of elements, then just revoke all elements starting at the scanning position
        //Loop invariant: for every position j<scanning_position the scratch array has the same elements as the new marker array

        const old_marker_state = await download_and_interpret_history(ethereum_wallet, selected_election.current)
        const scratch_array = old_marker_state.marker_array
        const new_marker_array: string[] = votingKeys.map(extract_markers)
        let scanning_position = 0
        const election_name = selected_election.current
        //Element by Element, compare the new marker array to the old marker array,
        //Until the scanning position is out of range for both arrays
        while (scanning_position < scratch_array.length || scanning_position < new_marker_array.length) {
            //Case 1: The scanning position is within range for both the scratch array and the new marker array
            if (scanning_position < scratch_array.length && scanning_position < new_marker_array.length) {
                const old_marker_element = scratch_array[scanning_position]
                const new_marker_element = new_marker_array[scanning_position]
                //Case 1.1: The elements are the same
                if (old_marker_element === new_marker_element) {
                    //Just advance the scan pointer and look at the next element
                    scanning_position += 1
                    continue
                }
                //Case 1.2 The elements are different, but the element in the new marker array's scanning position exists somewhere else
                //in the old marker array
                else if (scratch_array.includes(new_marker_element)) {
                    const old_position = scratch_array.findIndex((some_marker) => some_marker === new_marker_element)
                    scratch_array[scanning_position] = new_marker_element
                    scratch_array[old_position] = old_marker_element

                    //Mirror the swap transaction on the blockchain
                    await swap_markers(ethereum_wallet, election_name, scratch_array, scanning_position, old_position)

                    scanning_position += 1
                }
                //Case 1.3: the elements are different, and the element does not exist for the old marker array
                else {
                    scratch_array[scanning_position] = new_marker_element
                    scratch_array.push(old_marker_element)

                    //It should be an add followed by a swap in the blockchain
                    await add_marker(ethereum_wallet, election_name, new_marker_element, scratch_array.length)
                    await swap_markers(ethereum_wallet, election_name, scratch_array, scanning_position, scratch_array.length - 1)

                    scanning_position += 1
                }
            }
            //Case 2: The scanning position is within range for the scratch array, but not the new marker array
            else if (scanning_position < scratch_array.length && scanning_position >= new_marker_array.length) {
                //Revoke everything from the scratch array starting at the scanning position
                let marker_array_length = scratch_array.length
                for (let counter = scanning_position; counter < scratch_array.length; counter++) {
                    //Revoke each of these elements from the blockchain
                    const marker_to_revoke = scratch_array[counter]
                    marker_array_length -= 1
                    await revoke_marker(ethereum_wallet, election_name, marker_to_revoke, marker_array_length)
                }
                break
            }
            //Case 3: The scanning position is within range for the new marker array but not the scratch array
            else if (scanning_position >= scratch_array.length && scanning_position < new_marker_array.length) {
                for (let counter = scanning_position; counter < new_marker_array.length; counter++) {
                    //Add each marker to the scratch array and the blockchain
                    const new_marker_element = new_marker_array[counter]
                    scratch_array.push(new_marker_element)
                    await add_marker(ethereum_wallet, election_name, new_marker_element, scratch_array.length)
                }
            }

        }

        //Set the indicator to say that execution is done and the voter can move on.
        setStatusMessage("Save Complete. You may now proceed with your chosen key or leave this page.")
    }

    return (
        <Grid container rowSpacing={{xs: 4, md:10}} columnSpacing={{xs: 4, md:10}}>
            <Grid item xs={12} md={12} zeroMinWidth>
                <BackBar back_function={()=>{window.location.href="/#/voter_select_election"}} authority_bar={false}/>
            </Grid>

            <Grid item xs={12} md={12} zeroMinWidth>
                <Typography variant="h5" component="h5">Please select a marker</Typography>
            </Grid>

            <Grid item xs={12} md={12} zeroMinWidth>
                <KeyCard activeKey={activeKey} setActiveKey={setActiveKey} votingKeys={votingKeys} setVotingKeys={setVotingKeys} revokedKeys={revokedKeys} selected_marker={selected_marker} />
            </Grid>

            <Grid item xs={12} md ={12} zeroMinWidth>
                <Typography component="h4" variant="h4"> {statusMessage} </Typography>
            </Grid>

            <Grid item md={3} xs={6} zeroMinWidth>
                <Button variant="contained" onClick={add_key}>Add Marker</Button>
            </Grid>

            <Grid item md={2} xs={6} zeroMinWidth>
                <Button variant="contained" onClick={commit_changes}>Save</Button>
            </Grid>
   
            
            <Grid item md={7} xs={12}>
                <Button variant="contained" onClick={switch_to_ballot_screen}>Proceed with this Marker</Button>
            </Grid>


        </Grid>
    )

}
