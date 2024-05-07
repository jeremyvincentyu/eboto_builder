import { Card, Grid, Button } from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { Dayjs } from 'dayjs'
import { MutableRefObject } from 'react'
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import EthCrypto from 'eth-crypto'
import BackBar from './BackBar'

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface DateCardInterface {
    startDate: Dayjs | null,
    setStartDate: (new_date: Dayjs | null) => void,
    endDate: Dayjs | null,
    setEndDate: (new_date: Dayjs | null) => void
}

function DateCard({ startDate, endDate, setStartDate, setEndDate }: DateCardInterface) {

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

interface EditDurationInterface {
    startDate: Dayjs | null,
    setStartDate: (new_date: Dayjs | null) => void,
    endDate: Dayjs | null,
    setEndDate: (new_date: Dayjs | null) => void,
    selected_election: MutableRefObject<string>,
    ethereum_wallet: MutableRefObject<PackedWallet>
}

export default function EditDurationUI({ startDate, endDate, setStartDate, setEndDate, selected_election, ethereum_wallet }: EditDurationInterface) {
    async function commit_changed_dates() {
        const start_Date_string = startDate?.toString()
        const end_Date_string = endDate?.toString()
        const encrypted_auth_response: Response = await fetch("/get_authority_token")
        const encrypted_auth_packed: string = await encrypted_auth_response.text()
        const encrypted_auth_object = EthCrypto.cipher.parse(encrypted_auth_packed)
        const private_key = ethereum_wallet.current.account[0].privateKey
        const decrypted_auth_token = await EthCrypto.decryptWithPrivateKey(private_key, encrypted_auth_object)
        const body = JSON.stringify({ start_Date_string, end_Date_string, "token": decrypted_auth_token })
        console.log(`JSON Dates: ${body}`)
        await fetch(`/store_dates/${selected_election.current}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body
        })
        window.location.href = "#/ea_dashboard"
    }

    return (
        <Grid container rowSpacing={10} sx={{
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url("images/edit_duration.png")`,
            backgroundRepeat: "no-repeat",
        }}>

            <Grid item xs={12}>
                <BackBar back_function={() => { window.location.href = "#/modify_election" }} authority_bar={true} />
            </Grid>

            <Grid item xs={12}>
                <DateCard startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />
            </Grid>

            <Grid item xs={12}>
                <Button variant="contained" onClick={commit_changed_dates}>
                    Submit
                </Button>
            </Grid>


        </Grid>
    )

}
