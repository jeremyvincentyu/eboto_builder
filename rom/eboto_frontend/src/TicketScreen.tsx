import {Grid, Typography, Card, Button} from "@mui/material"
import { MutableRefObject } from "react"
import BackBar from "./BackBar"

function TicketCard({ticket_contents}: {ticket_contents: MutableRefObject<string>}){
    function download_ticket(){
    const ticket = new Blob([ticket_contents.current],{type: "application/json"})
    const ticket_link = URL.createObjectURL(ticket)
    const temp_anchor = document.createElement('a')
    temp_anchor.href = ticket_link
    temp_anchor.download = "ticket.json"
    document.body.appendChild(temp_anchor)
    temp_anchor.click()
    document.body.removeChild(temp_anchor)
    }

    return (
        <Card elevation={8} sx={{padding: "1em", backgroundColor: "#0ec970"}}>
        <Grid container rowSpacing={6}>

        <Grid item xs={12}>
        <Typography variant="h5" component="h5">
        Would you like to download a ticket?
        </Typography>
        </Grid>

        <Grid item xs={12}>
        <Button variant="contained" onClick={download_ticket}>
        Download Ticket
        </Button>
        </Grid>

        </Grid>
        </Card>
    )
}

function return_to_election_menu(){
    window.location.href = "#/voter_select_election"
}

export default function TicketScreenUI({ticket_contents}: {ticket_contents: MutableRefObject<string>}){
return (
    <Grid container rowSpacing={5}>
    
    <Grid item xs={12}>
    <BackBar back_function={return_to_election_menu} authority_bar={false}/>
    </Grid>

    <Grid item xs={12}>
    <Typography variant ="h4" component="h4">
    Thank you for casting your vote
    </Typography>

    </Grid>

    <Grid item xs={2}>
    </Grid>

    <Grid item xs={8}>
    <TicketCard ticket_contents={ticket_contents}/>
    </Grid>

    <Grid item xs={2}>
    </Grid>




    </Grid>
    )
}
