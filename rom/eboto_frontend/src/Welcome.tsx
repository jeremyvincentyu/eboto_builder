import { AppBar, Toolbar, Card, MenuItem, Grid, Button, Typography, Box } from "@mui/material"

import BottomBar from "./BottomBar"

function login() {
    window.location.href = "#/login"
}



function TitleBar() {
    return (
        <AppBar sx={{ backgroundColor: "#000000" }}>
            <Toolbar>
                <MenuItem>
                    <Typography color="#0ec970" variant="h3" component="h1">
                        e
                    </Typography>
                    <Typography variant="h3" component="h1">
                        Boto
                    </Typography>
                </MenuItem>
            </Toolbar>
        </AppBar>
    )
}

export default function WelcomeScreen() {
    return (

        <Grid container columnSpacing={5} rowSpacing={5}>
            <Grid item xs={12}>
                <TitleBar />
            </Grid>

            <Grid item xs={12} md={6}>

                <Card elevation={8} sx={{ backgroundColor: "#0ec970" }}>
                    <Grid container>
                        <Grid item xs={12}>
                            <Typography component="h3" variant="h2">
                                VOTE NOW!
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography component="h4" variant="h4">
                                ANYTIME AND ANYWHERE
                            </Typography>
                        </Grid>
                    </Grid>
                </Card>

            </Grid>


            <Grid item xs={12} md={6}>
                <Box sx={{
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundImage: `url("images/philippines.png")`,
                    backgroundRepeat: "no-repeat",
                    height: "40em"
                }}
                >
                    <Grid container rowSpacing={4} sx={{ mt: "2em" }}>

                        <Grid item xs={12}>
                            <Typography component="h2" variant="h2">
                                WELCOME
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography component="h6" variant="body1" sx={{ color: "#14a4ad" }}>
                                GET STARTED HERE!
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <Button onClick={login} variant="contained">
                                ENTER
                            </Button>
                        </Grid>

                    </Grid>
                </Box>

            </Grid>
            <Grid item xs={12}>
                <BottomBar />
            </Grid>
        </Grid >


    )
}