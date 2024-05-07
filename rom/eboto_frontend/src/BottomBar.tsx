import {Toolbar,Link, Typography, MenuItem} from "@mui/material"

export default function BottomBar(){
    return (
        <Toolbar>
            <MenuItem>
            <Link href="https://github.com/jeremyvincentyu/eBoto2">
            <Typography>
                Source Code
            </Typography>
            </Link>
            </MenuItem>
            
            <MenuItem>
            <Link href="/license.txt">
            <Typography>
                License Text
            </Typography>
            </Link>
            </MenuItem>

        </Toolbar>
    )
}