import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Navbar from 'react-bootstrap/Navbar';
import { FaChessBishop, FaPlus, FaMagnifyingGlass } from "react-icons/fa6";
import { Routes, Route } from 'react-router-dom';
import CreateClient from './components/Clients/CreateClient/CreateClient'
import CreatePlayer from './components/Players/CreatePlayer/CreatePlayer'
import CreateGame from './components/Games/CreateGame/CreateGame'
import CreateMatch from './components/Matches/CreateMatch/CreateMatch'
import DbTableView from './components/DbTableView/DbTableView'

function App() {
  return (
    <>
        <Routes>
            <Route path="/" element={<CreateClient />} />
            <Route path="/players/create" element={<CreatePlayer />} />
            <Route path="/players/search" element={<DbTableView context="players" />} />
            <Route path="/clients/create" element={<CreateClient />} />
            <Route path="/clients/search" element={<DbTableView context="clients" />} />
            <Route path="/matches/create" element={<CreateMatch />} />
            <Route path="/matches/search" element={<DbTableView context="matches" />} />
            <Route path="/games/create" element={<CreateGame />} />
            <Route path="/games/search" element={<DbTableView context="games" />} />
        </Routes>

        <div className="App">
            <Navbar bg="dark" data-bs-theme="dark">
            <Container>
                <Navbar.Brand href="#home"><FaChessBishop></FaChessBishop> Go Battle</Navbar.Brand>
                <Nav className="me-auto">
                <Nav.Link href="/">Home</Nav.Link>
                <NavDropdown title="Players" id="players-dropdown">
                    <NavDropdown.Item href="/players/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Players</NavDropdown.Item>
                    <NavDropdown.Item href="/players/create"><FaPlus></FaPlus> Create Player</NavDropdown.Item>
                </NavDropdown>
                <NavDropdown title="Clients" id="clients-dropdown">
                    <NavDropdown.Item href="/clients/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Clients</NavDropdown.Item>
                    <NavDropdown.Item href="/clients/create"><FaPlus></FaPlus> Create Client</NavDropdown.Item>
                </NavDropdown>
                <NavDropdown title="Matches" id="matches-dropdown">
                    <NavDropdown.Item href="/matches/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Matches</NavDropdown.Item>
                    <NavDropdown.Item href="/matches/create"><FaPlus></FaPlus> Create Match</NavDropdown.Item>
                </NavDropdown>
                <NavDropdown title="Games" id="games-dropdown">
                    <NavDropdown.Item href="/games/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Games</NavDropdown.Item>
                    <NavDropdown.Item href="/games/create"><FaPlus></FaPlus> Create Game</NavDropdown.Item>
                </NavDropdown>
                </Nav>
            </Container>
            </Navbar>

            <div className="body">

            </div>
        </div>
    </>
  );
}

export default App;
