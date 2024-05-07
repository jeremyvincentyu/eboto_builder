import { Input, Typography, Grid, Button, Modal, Card, Box, AppBar, MenuItem, Toolbar } from "@mui/material"
import { useRef, useState, MutableRefObject } from 'react';
import EthCrypto from 'eth-crypto';
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import post_body from "./post_body";
import check_blockchain_available from "./blockchain_available";
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}



function make_wallet(keyfile: MutableRefObject<HTMLInputElement | null>, ethereum_wallet: MutableRefObject<PackedWallet>, postload: () => void) {
    if (keyfile.current !== null && keyfile.current.files !== null) {
        const file_handle = keyfile.current.files[0]
        const key_reader = new FileReader();
        key_reader.readAsText(file_handle);
        key_reader.onload = () => {
            // Recover Private Key from  file
            const private_key_string = key_reader.result;
            if (typeof private_key_string === "string") {
                const private_key: { private: string } = JSON.parse(private_key_string);

                //Add wallet
                ethereum_wallet.current.account = ethereum_wallet.current.web3.eth.accounts.wallet.add(private_key.private)
                postload()
            }

        }
    }
}
interface VoterRow {
    id: number,
    full_name: string,
    eth_address: string,
    pubkey: string,
    elections_joined: string[]
}

type voterDatabaseSetter = (newVoterDatabase: (oldVoterDatabase: VoterRow[]) => VoterRow[]) => void

interface ContractVoter {
    encrypted_full_name: string
    public_key: string,
    addr: string,
    elections_joined: string[]
}

async function download_data(ethereum_wallet: MutableRefObject<PackedWallet>, setVoterDatabase: voterDatabaseSetter) {
    const decryptedDatabase: VoterRow[] = []
    const private_key = ethereum_wallet.current.account[0].privateKey
    const encryptedDatabase: ContractVoter[] = await ethereum_wallet.current.contract.methods.downloadVoterList().call()
    for (let entry_counter = 0; entry_counter < encryptedDatabase.length; entry_counter++) {
        const current_row = encryptedDatabase[entry_counter]
        const address = current_row.addr
        const public_key = current_row.public_key
        const encrypted_full_name = current_row.encrypted_full_name
        const elections_joined = current_row.elections_joined
        const encrypted_full_name_object = EthCrypto.cipher.parse(encrypted_full_name)
        const decrypted_salted_name = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_full_name_object)
        console.log(`Decrypted salted name: ${decrypted_salted_name}`)
        const salted_name_object = JSON.parse(decrypted_salted_name)
        const decrypted_full_name = salted_name_object.actual_name
        decryptedDatabase.push(
            {
                id: entry_counter,
                full_name: decrypted_full_name,
                eth_address: address,
                pubkey: public_key,
                elections_joined
            }
        )
    }

    setVoterDatabase(() => { return decryptedDatabase })
}



function switch_to_ea_view(keyfile: MutableRefObject<HTMLInputElement | null>, ethereum_wallet: MutableRefObject<PackedWallet>, setVoterDatabase: voterDatabaseSetter) {
    async function get_authority_address() {
        console.log("Attempting to Obtain Authority Address")
        const contract_authority_address: string = await ethereum_wallet.current.contract.methods.get_authority_address().call()
        console.log(`Obtained Address is ${contract_authority_address}`)
        if (ethereum_wallet.current.account[0].address !== contract_authority_address) {
            window.location.href = "#/authority_error"
            ethereum_wallet.current.account.clear()
            return
        }
        else {
            await download_data(ethereum_wallet, setVoterDatabase)
            window.location.href = "#/ea_dashboard"
        }
    }

    make_wallet(keyfile, ethereum_wallet, get_authority_address)

}

type VoterElectionSetter = (newElections: (oldElections: string[]) => string[]) => void

function switch_to_voter_view(keyfile: MutableRefObject<HTMLInputElement | null>, ethereum_wallet: MutableRefObject<PackedWallet>, setVoterElections: VoterElectionSetter) {


    async function bifurcated_check_voter_enrolled() {
        //Check some endpoint to determine whether the blockchain is available yet
        const blockchain_available = await check_blockchain_available()
        const my_address = ethereum_wallet.current.account[0].address

        //If blockchain is available, call using the walconst directly
        if (blockchain_available) {
            return await ethereum_wallet.current.contract.methods.check_voter_enrolled(my_address).call()
        }

        //If blockchain is not available, ask the isolation server
        else {
            const enrolled_response = await fetch("/check_voter_enrolled", post_body(JSON.stringify({ "address": my_address })))
            return enrolled_response.json()
        }
    }

    async function filter_out_unstarted(voter_elections: string[]) {
        const filtered: string[] = []
        const blockchain_available = await check_blockchain_available()
        for (let counter = 0; counter < voter_elections.length; counter++) {
            const current_election = voter_elections[counter]
            if (blockchain_available) {
                const election_started: boolean = await ethereum_wallet.current.contract.methods.is_visible(current_election).call()
                if (election_started) { filtered.push(current_election) }
            }
            else {
                const election_started_response: Response = await fetch("/is_visible", post_body(JSON.stringify({ actual_name: current_election })))
                const election_started: boolean = await election_started_response.json()
                if (election_started) { filtered.push(current_election) }
            }
        }
        return filtered
    }

    async function bifurcated_get_voter_elections() {
        //Check some endpoint to determine whether the blockchain is available yet
        const blockchain_available = await check_blockchain_available()
        const my_address = ethereum_wallet.current.account[0].address

        //If blockchain is available, call using the walconst directly
        if (blockchain_available) {
            const voter_elections: string[] = await ethereum_wallet.current.contract.methods.downloadVoterElections(my_address).call()
            //Filter out elections that have not yet started
            return await filter_out_unstarted(voter_elections)
        }

        //If blockchain is not available, ask the isolation server using XMLHTTPRequest
        else {
            const voter_elections_response: Response = await fetch("/download_voter_elections", post_body(JSON.stringify({ "address": my_address })))
            const voter_elections: string[] = await voter_elections_response.json()
            //Filter out elections that have not yet started
            return await filter_out_unstarted(voter_elections)
        }
    }



    async function check_voter_enrolled() {
        const voter_enrolled = await bifurcated_check_voter_enrolled()
        if (voter_enrolled) {
            //Get list of elections that voter is in
            const voter_elections: string[] = await bifurcated_get_voter_elections()
            //Set Voter Elections to that value
            setVoterElections(() => { return voter_elections; })
            window.location.href = "#/voter_select_election"

        }
        else {
            window.location.href = "#/voter_error"
            ethereum_wallet.current.account.clear()
        }
    }

    make_wallet(keyfile, ethereum_wallet, check_voter_enrolled)

}

interface LoginInterface {
    ethereum_wallet: MutableRefObject<PackedWallet>,
    setVoterDatabase: voterDatabaseSetter,
    setVoterElections: VoterElectionSetter
}



function TitleBar() {
    function go_home() {
        window.location.href = "#/"
    }

    return (
        <AppBar sx={{ backgroundColor: "#000000" }}>
            <Toolbar sx={{justifyContent: "space-between"}}>
                <MenuItem>
                    <Button sx={{ fontSize: "large" }} startIcon={<KeyboardArrowLeftIcon />} onClick={go_home} />
                </MenuItem>
                <MenuItem>
                    <Typography color="#0ec970" variant="h3" component="h1" sx={{flexGrow:1, textAlign: "center"}}>
                        e
                    </Typography>
                    <Typography variant="h3" component="h1" sx={{flexGrow:1, textAlign: "center"}}>
                        Boto
                    </Typography>
                </MenuItem>
                <MenuItem>
                <AccountCircleIcon/>
                </MenuItem>
            </Toolbar>
        </AppBar>
    )
}

export default function LoginUI({ ethereum_wallet, setVoterDatabase, setVoterElections }: LoginInterface) {
    //Create the filepicker
    //Login Once the file is chosen
    const keyfile = useRef<HTMLInputElement>(null);
    const [popped, setPopped] = useState(false);
    const generated_key = useRef({ address: "", private_key: "", public_key: "" })

    function generate_account() {
        const account = ethereum_wallet.current.web3.eth.accounts.create();
        generated_key.current.private_key = account.privateKey;
        generated_key.current.public_key = EthCrypto.publicKeyByPrivateKey(generated_key.current.private_key)
        generated_key.current.address = EthCrypto.publicKey.toAddress(generated_key.current.public_key)
        setPopped(true);
    }

    function download_private_key() {
        const private_key = new Blob([JSON.stringify({ "private": generated_key.current.private_key })], { type: "application/json" })
        const private_key_link = URL.createObjectURL(private_key)
        const temp_anchor = document.createElement('a');
        temp_anchor.href = private_key_link
        temp_anchor.download = "private.json"
        document.body.appendChild(temp_anchor)
        temp_anchor.click()
        document.body.removeChild(temp_anchor)
    }

    function download_public_key() {
        const public_key = new Blob([JSON.stringify(
            {
                "public": generated_key.current.public_key,
                "address": generated_key.current.address

            }
        )], { type: "application/json" })
        const public_key_link = URL.createObjectURL(public_key)
        const temp_anchor = document.createElement('a');
        temp_anchor.href = public_key_link
        temp_anchor.download = "public.json"
        document.body.appendChild(temp_anchor)
        temp_anchor.click()
        document.body.removeChild(temp_anchor)
    }

    return (
        <Box sx={{
            backgroundSize: "cover",
            backgroundPosition: "bottom",
            backgroundImage: `url("images/login.png")`,
            backgroundRepeat: "no-repeat",
        }}>

            <Modal open={popped} onClose={() => { setPopped(false) }}>
                <Card elevation={8} sx={{ margin: "10em" }}>
                    <Box component="div" sx={{ ml: 50 }}>
                        <Grid container rowSpacing={{ xs: 5 }}>

                            <Grid item xs={12}>
                                <Button variant="contained" onClick={download_private_key}>
                                    Download Private Key
                                </Button>
                            </Grid>


                            <Grid item xs={12}>
                                <Button variant="contained" onClick={download_public_key}>
                                    Download Public Key
                                </Button>
                            </Grid>

                        </Grid>
                    </Box>
                </Card>
            </Modal>
            <TitleBar />

            <Grid container rowSpacing={{ xs: 10 }} sx={{
                                    backgroundSize: "contain",
                                    backgroundPosition: "center",
                                    backgroundImage: `url("images/login_c.png")`,
                                    backgroundRepeat: "no-repeat",
                                    height: "20em"
            }}>

                <Grid item xs={12}>
                    <Typography variant="h3" component="h1">
                        Log In with Your Private Key
                    </Typography>
                </Grid>

                <Grid item xs={12}>
                    <Input type="file" margin="dense" inputRef={keyfile} />
                </Grid>

                <Grid item md={4} xs={12}>
                    <Button variant="contained" onClick={() => { switch_to_ea_view(keyfile, ethereum_wallet, setVoterDatabase) }}>
                        Log In as Election Authority
                    </Button>
                </Grid>

                <Grid item md={4} xs={12}>
                    <Button variant="contained" onClick={() => { switch_to_voter_view(keyfile, ethereum_wallet, setVoterElections) }} >
                        Log In as Voter
                    </Button>
                </Grid>

                <Grid item md={4} xs={12}>
                    <Button variant="contained" onClick={generate_account} >
                        Generate An Account
                    </Button>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="body2" component="h3" align="left">
                        Your private key will not be uploaded to any server; it will only be used by this web app locally running on your browser to authenticate your actions.
                    </Typography>
                </Grid>

            </Grid>
        </Box>
    )
}
