import {Typography, Grid} from "@mui/material"

export default function VoterErrorUI(){
    return (
    <Grid container>


    <Grid item xs={12}>
    <Typography component="h3" variant="h3">
    The election authority has not registered you yet.
    </Typography>
    </Grid>

    </Grid>
    )
}
