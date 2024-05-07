import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import WelcomeScreen from './Welcome.tsx'
import LoginUI from "./Login.tsx"
import ElectionAuthorityUI from "./ElectionAuthority.tsx"
import SelectElectionUI from "./SelectElection.tsx"
import ModifyElectionUI from "./ModifyElection.tsx"
import CreateElectionUI from "./CreateElection.tsx"
import AddCandidateUI from "./AddCandidate.tsx"
import EditPositionUI from "./EditPosition.tsx"
import EditDurationUI from "./EditDuration.tsx"
import EditParticipationUI from "./EditParticipation.tsx"
import ViewResultsUI from "./ViewResults.tsx"
import EnrollVoterUI from "./EnrollVoter.tsx"
import VoterSelectElectionUI from "./VoterSelectElection.tsx"
import CheaterScreenUI from "./CheaterScreen.tsx"
import BallotScreenUI from "./BallotScreen.tsx"
import TicketScreenUI from "./TicketScreen.tsx"
import VoterViewResultUI from './VoterViewResults.tsx'
import VoterErrorUI from "./VoterError.tsx"
import AuthorityErrorUI from "./AuthorityError.tsx"
import EA_Account_ABI from "./EA_Account.json"
import deployed_addresses from "./deployed_addresses.json"
import './index.css'
import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { useState, useRef, MutableRefObject } from 'react'
import { Web3, Contract, ContractAbi, Web3BaseWallet, Web3BaseWalletAccount } from 'web3'
import dayjs, { Dayjs } from 'dayjs';
const simple_root = document.getElementById('root')

const react_root = ReactDOM.createRoot(simple_root!);

interface ElectionResult {
    id: number,
    full_name: string,
    role: string,
    votes: number
}

interface PackedWallet {
    web3: Web3,
    contract: Contract<ContractAbi>,
    account: Web3BaseWallet<Web3BaseWalletAccount>
}

interface VoterRow {
    id: number,
    eth_address: string,
    pubkey: string,
    full_name: string,
    elections_joined: string[]
}

interface SelectiveVoterRow {
    id: number,
    ethereum_address: string,
    full_name: string,
    selected: boolean,
    rerender: (newRows: (oldRows: SelectiveVoterRow[]) => SelectiveVoterRow[]) => void
}

interface CandidateRow {
    id: number,
    full_name: string,
    role: string
}

interface Election {
    id: number,
    election_name: string,
    election_over: boolean,
    selected_election: MutableRefObject<string>,
    end_election: () => void
    view_election: () => void
}


interface VotingKey {
    position: number,
    key: string
}

interface ContractCandidate {
    id: number,
    name: string,
    role: string
}

interface RolewithChoices {
    role: string,
    choices: ContractCandidate[],
    choice: number
}

export default function MainRouter() {
    const contract_address = deployed_addresses["eBoto#EA_Account"]
    const abi = EA_Account_ABI

    const web3_instance = new Web3("http://127.0.0.1:8545")

    const contract_instance = new web3_instance.eth.Contract(abi, contract_address)

    const blank_account: Web3BaseWallet<Web3BaseWalletAccount> = web3_instance.eth.accounts.wallet.create(1)

    blank_account.clear()

    const ethereum_wallet = useRef<PackedWallet>(
        {
            web3: web3_instance,
            contract: contract_instance,
            account: blank_account
        }
    );
    const selected_election = useRef("");
    const selected_marker = useRef("")
    const [voterDatabase, setVoterDatabase] = useState<VoterRow[]>([])
    const [selectiveVoterDatabase, setSelectiveVoterDatabase] = useState<SelectiveVoterRow[]>([])
    const [electionList, setElectionList] = useState<Election[]>([])
    const [candidateList, setCandidateList] = useState<CandidateRow[]>([])
    const [electionResults, setElectionResults] = useState<ElectionResult[]>([])
    const [rolesWithChoices, setRolesWithChoices] = useState<RolewithChoices[]>([])
    const [voterElections, setVoterElections] = useState<string[]>([])
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs('1970-01-01T00:00'))
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs('1970-01-01T00:00'))
    const [votingKeys, setVotingKeys] = useState<VotingKey[]>([])
    const [activeKey, setActiveKey] = useState("")
    const [statusMessage, setStatusMessage] = useState("")
    const revokedKeys = useRef<string[]>([])
    const ticket_contents = useRef<string>("")

    const main_router = createHashRouter(
        createRoutesFromElements(
            <Route element={<App />}>

                <Route path="/" element={<WelcomeScreen />} />

                <Route path="/login" element={<LoginUI ethereum_wallet={ethereum_wallet} setVoterDatabase={setVoterDatabase} setVoterElections={setVoterElections} />} />

                <Route path="/ea_dashboard" element={<ElectionAuthorityUI setStatusMessage={setStatusMessage} setElectionList={setElectionList} ethereum_wallet={ethereum_wallet} rows={voterDatabase} setSelectiveDB={setSelectiveVoterDatabase} selected_election={selected_election} setElectionResults={setElectionResults} />} />

                <Route path="/ea_select_election" element={<SelectElectionUI election_list={electionList} />} />

                <Route path="/modify_election" element={<ModifyElectionUI selected_election={selected_election} setCandidateList={setCandidateList} ethereum_wallet={ethereum_wallet} voterDatabase={voterDatabase} setSelectiveVoterDatabase={setSelectiveVoterDatabase} setStartDate={setStartDate} setEndDate={setEndDate} />} />

                <Route path="/create_election" element={<CreateElectionUI statusMessage={statusMessage} setStatusMessage={setStatusMessage} ethereum_wallet={ethereum_wallet} selectiveVoterDatabase={selectiveVoterDatabase} setSelectiveVoterDatabase={setSelectiveVoterDatabase} setVoterDatabase={setVoterDatabase} />} />

                <Route path="/add_candidate" element={<AddCandidateUI selected_election={selected_election} rows={candidateList} setRows={setCandidateList} ethereum_wallet={ethereum_wallet} />} />

                <Route path="/edit_positions" element={<EditPositionUI selected_election={selected_election} rows={candidateList} setRows={setCandidateList} ethereum_wallet={ethereum_wallet} />} />

                <Route path="/edit_duration" element={<EditDurationUI selected_election={selected_election} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} ethereum_wallet={ethereum_wallet} />} />

                <Route path="/edit_participation" element={<EditParticipationUI selected_election={selected_election} selectiveVoterDatabase={selectiveVoterDatabase} setVoterDatabase={setVoterDatabase} setSelectiveVoterDatabase={setSelectiveVoterDatabase} ethereum_wallet={ethereum_wallet} voter_list={voterDatabase} />} />

                <Route path="/view_results" element={<ViewResultsUI electionResults={electionResults} />} />

                <Route path="/enroll_voter" element={<EnrollVoterUI ethereum_wallet={ethereum_wallet} rows={voterDatabase} setRows={setVoterDatabase} />} />

                <Route path="/voter_select_election" element={<VoterSelectElectionUI selected_marker={selected_marker} setStatusMessage={setStatusMessage} setActiveKey={setActiveKey} ethereum_wallet={ethereum_wallet} voterElections={voterElections} selected_election={selected_election} setElectionResults={setElectionResults} setVotingKeys={setVotingKeys} revokedKeys={revokedKeys} />} />

                <Route path="/cheater_screen" element={<CheaterScreenUI statusMessage={statusMessage} setStatusMessage={setStatusMessage} activeKey={activeKey} setActiveKey={setActiveKey} votingKeys={votingKeys} setVotingKeys={setVotingKeys} revokedKeys={revokedKeys} ethereum_wallet={ethereum_wallet} selected_election={selected_election} selected_marker={selected_marker} setRolesWithChoices={setRolesWithChoices} />} />

                <Route path="/ballot_screen" element={<BallotScreenUI ethereum_wallet={ethereum_wallet} selected_election={selected_election} selected_marker={selected_marker} rolesWithChoices={rolesWithChoices} setRolesWithChoices={setRolesWithChoices} ticket_contents={ticket_contents} />} />

                <Route path="/ticket_screen" element={<TicketScreenUI ticket_contents={ticket_contents} />} />

                <Route path="/voter_view_results" element={<VoterViewResultUI electionResults={electionResults} />} />

                <Route path="/voter_error" element={<VoterErrorUI />} />

                <Route path="/authority_error" element={<AuthorityErrorUI />} />

            </Route>
        )
    );
    const darkTheme = createTheme(
        {
            palette: {
                mode: 'dark',
                primary: {
                    main: '#ffffff',
                },
                secondary: {
                    main: '#8ce24c',
                },
                text: {
                    primary: 'rgba(255,255,255,0.87)',
                },
                background: {
                    default: '#2d2a2a',
                    paper: '#6b6767',
                },

            },
            components: {

                MuiButton: {
                    defaultProps: {
                        size: "large"
                    },
                    styleOverrides: {
                        root: {
                            "&:active": {
                                backgroundColor: "#0ec970",
                                color: "white"
                            },
                            "&:hover": {
                                backgroundColor: "#0ec970",
                                color: "white"
                            },
                            borderRadius: '16px'

                        }
                    }
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            borderRadius: '16px'
                        }
                    }
                }
            }
        }
    )


    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline/>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <RouterProvider router={main_router} />
            </LocalizationProvider >
        </ThemeProvider >
    )

}


react_root.render(<MainRouter />);
