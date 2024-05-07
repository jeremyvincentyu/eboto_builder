import { Card, Container } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import BackBar from './BackBar'

interface ElectionResult {
        id: number,
        full_name: string,
        role: string,
        votes: number
}

export default function ViewResultUI({ electionResults }: { electionResults: ElectionResult[] }) {
        const columns: GridColDef[] = [
                { field: 'id', headerName: "#", width: 50 },
                { field: "full_name", headerName: "Full Name", width: 200 },
                { field: "role", headerName: "Role", width: 100 },
                { field: "votes", headerName: "Votes", width: 200 },
        ]

        return (
                <Container sx={{
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundImage: `url("images/view_results.png")`,
                        backgroundRepeat: "no-repeat",
                        alignItems: "stretch",
                        justifyContent: "center",
                        display: "flex"
                }} maxWidth={false}>
                <BackBar back_function={()=>{window.location.href = "#/ea_select_election"}} authority_bar={true}/>                        <Card elevation={8} style={{ padding: "1em" }}>
                                <DataGrid
                                        rows={electionResults}
                                        columns={columns}
                                        initialState={{
                                                pagination: {
                                                        paginationModel: { page: 0, pageSize: 5 }
                                                }
                                        }}
                                        pageSizeOptions={[5]}
                                />
                        </Card>
                </Container>

        )

}
