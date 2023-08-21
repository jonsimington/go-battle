import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Navbar from 'react-bootstrap/Navbar';
import { FaChessBishop, FaPlus, FaMagnifyingGlass } from "react-icons/fa6";


function App() {
  return (
    <div className="App">
      <Navbar bg="dark" data-bs-theme="dark">
        <Container>
          <Navbar.Brand href="#home"><FaChessBishop></FaChessBishop> Go Battle</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <NavDropdown title="Players" id="players-dropdown">
                <NavDropdown.Item href="#players/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Players</NavDropdown.Item>
                <NavDropdown.Item href="#players/create"><FaPlus></FaPlus> Create Player</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Clients" id="clients-dropdown">
                <NavDropdown.Item href="#clients/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Clients</NavDropdown.Item>
                <NavDropdown.Item href="#clients/create"><FaPlus></FaPlus> Create Client</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Matches" id="matches-dropdown">
                <NavDropdown.Item href="#matches/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Matches</NavDropdown.Item>
                <NavDropdown.Item href="#matches/create"><FaPlus></FaPlus> Create Match</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Games" id="games-dropdown">
                <NavDropdown.Item href="#games/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Games</NavDropdown.Item>
                <NavDropdown.Item href="#games/create"><FaPlus></FaPlus> Create Game</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Container>
      </Navbar>

      <div className="body">

      </div>
    </div>
  );
}

export default App;
