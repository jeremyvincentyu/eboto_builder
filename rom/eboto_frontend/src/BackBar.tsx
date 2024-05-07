import { Typography, Button, AppBar, MenuItem, Toolbar} from "@mui/material"
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';


interface BackBarInterface{
    back_function: ()=>void,
    authority_bar: boolean
}

export default function BackBar({back_function,authority_bar}: BackBarInterface) {
    if (authority_bar){
        return(
        <AppBar sx={{ backgroundColor: "#000000" }}>
        <Toolbar sx={{justifyContent: "space-between"}}>
            <MenuItem>
                <Button sx={{ fontSize: "large" }} startIcon={<KeyboardArrowLeftIcon />} onClick={back_function} />
            </MenuItem>
            <MenuItem>
                <Typography color="red" variant="h3" component="h1" sx={{flexGrow:1, textAlign: "center"}}>
                    e
                </Typography>
                <Typography variant="h3" component="h1" sx={{flexGrow:1, textAlign: "center"}}>
                    Boto
                </Typography>
            </MenuItem>
            <MenuItem>
            <AccountCircleIcon/>
            <Typography variant="h6" component="h6">AUTHORITY</Typography>
            
            </MenuItem>
        </Toolbar>
    </AppBar>
        )
    }
    else{
    return (
        <AppBar sx={{ backgroundColor: "#000000" }}>
            <Toolbar sx={{justifyContent: "space-between"}}>
                <MenuItem>
                    <Button sx={{ fontSize: "large" }} startIcon={<KeyboardArrowLeftIcon />} onClick={back_function} />
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
                <Typography variant="h6" component="h6">VOTER</Typography>
                </MenuItem>
            </Toolbar>
        </AppBar>
    )
    }
}