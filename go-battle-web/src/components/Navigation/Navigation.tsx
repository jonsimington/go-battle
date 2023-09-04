import React, { FC } from 'react';
import styles from './Navigation.module.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Navbar from 'react-bootstrap/Navbar';
import { FaChessBishop, FaPlus, FaMagnifyingGlass, FaShuffle } from "react-icons/fa6";

interface NavigationProps {}

const Navigation: FC<NavigationProps> = () => {
    const cerveauUrl = process.env.REACT_APP_CERVEAU_URL;
    const visUrl = process.env.REACT_APP_VIS_URL;

    return (
        <div className={styles.Navigation} data-testid="Navigation">
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
                      <NavDropdown.Item href="/matches/random"><FaShuffle></FaShuffle> Create Random Match</NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Games" id="games-dropdown">
                      <NavDropdown.Item href="/games/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Games</NavDropdown.Item>
                      <NavDropdown.Item href="/games/create"><FaPlus></FaPlus> Create Game</NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Tournaments" id="tournaments-dropdown">
                      <NavDropdown.Item href="/tournaments/search"><FaMagnifyingGlass></FaMagnifyingGlass> Search Tournaments</NavDropdown.Item>
                      <NavDropdown.Item href="/tournaments/create"><FaPlus></FaPlus> Create Tournament</NavDropdown.Item>
                  </NavDropdown>
                  <Nav.Link href={cerveauUrl}>Cerveau</Nav.Link>
                  <Nav.Link href={visUrl}>Viseur</Nav.Link>
                  </Nav>
              </Container>
          </Navbar>
        </div>
    );
}





export default Navigation;
