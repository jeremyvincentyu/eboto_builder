import {Typography, Grid} from "@mui/material"

export default function AuthorityErrorUI(){
    return (
    <Grid container>


    <Grid item xs={12}>
    <Typography component="h3" variant="h3">
    Your private key is not the election authority's private key.
    </Typography>
    </Grid>

    </Grid>
    )
}
