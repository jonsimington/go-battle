import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { FaChessBishop } from "react-icons/fa6";


function App() {
  return (
    <div className="App">
      <Navbar bg="dark" data-bs-theme="dark">
        <Container>
          <Navbar.Brand href="#home"><FaChessBishop></FaChessBishop> Go Battle</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#features">Game History</Nav.Link>
            <Nav.Link href="#pricing">Create Game</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <div className="body">

      </div>
    </div>
  );
}

export default App;
