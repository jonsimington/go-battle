import React, { FC } from 'react';
import styles from './Navigation.module.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Navbar from 'react-bootstrap/Navbar';
import { FaChessBishop, FaPlus, FaMagnifyingGlass, FaShuffle, FaUser, FaRightFromBracket } from "react-icons/fa6";
import { getCerveauUrl, getVisUrl } from '../../utils/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavigationProps {}

const Navigation: FC<NavigationProps> = () => {
    const cerveauUrl = getCerveauUrl();
    const visUrl = getVisUrl();
    const navigate = useNavigate();
    const { user, isAuthenticated, isAdmin, logout } = useAuth();

    const go = (path: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        navigate(path);
    };

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        logout();
        navigate('/');
    };

    return (
        <div className={styles.Navigation} data-testid="Navigation">
          <Navbar bg="dark" data-bs-theme="dark" expand="lg">
              <Container>
                  <Navbar.Brand href="/" onClick={go("/")}><FaChessBishop /> Go Battle</Navbar.Brand>
                  <Navbar.Toggle aria-controls="main-navbar-nav" />
                  <Navbar.Collapse id="main-navbar-nav">
                      <Nav className="me-auto">
                      <Nav.Link href="/" onClick={go("/")}>Home</Nav.Link>
                      <NavDropdown title="Players" id="players-dropdown">
                          <NavDropdown.Item href="/players/search" onClick={go("/players/search")}><FaMagnifyingGlass /> Search Players</NavDropdown.Item>
                          {isAdmin && <NavDropdown.Item href="/players/create" onClick={go("/players/create")}><FaPlus /> Create Player</NavDropdown.Item>}
                      </NavDropdown>
                      <NavDropdown title="Clients" id="clients-dropdown">
                          <NavDropdown.Item href="/clients/search" onClick={go("/clients/search")}><FaMagnifyingGlass /> Search Clients</NavDropdown.Item>
                          {isAdmin && <NavDropdown.Item href="/clients/create" onClick={go("/clients/create")}><FaPlus /> Create Client</NavDropdown.Item>}
                      </NavDropdown>
                      <NavDropdown title="Matches" id="matches-dropdown">
                          <NavDropdown.Item href="/matches/search" onClick={go("/matches/search")}><FaMagnifyingGlass /> Search Matches</NavDropdown.Item>
                          {isAdmin && <NavDropdown.Item href="/matches/create" onClick={go("/matches/create")}><FaPlus /> Create Match</NavDropdown.Item>}
                          {isAdmin && <NavDropdown.Item href="/matches/random" onClick={go("/matches/random")}><FaShuffle /> Create Random Match</NavDropdown.Item>}
                      </NavDropdown>
                      <NavDropdown title="Games" id="games-dropdown">
                          <NavDropdown.Item href="/games/search" onClick={go("/games/search")}><FaMagnifyingGlass /> Search Games</NavDropdown.Item>
                          {isAdmin && <NavDropdown.Item href="/games/create" onClick={go("/games/create")}><FaPlus /> Create Game</NavDropdown.Item>}
                      </NavDropdown>
                      <NavDropdown title="Tournaments" id="tournaments-dropdown">
                          <NavDropdown.Item href="/tournaments/search" onClick={go("/tournaments/search")}><FaMagnifyingGlass /> Search Tournaments</NavDropdown.Item>
                          {isAdmin && <NavDropdown.Item href="/tournaments/create" onClick={go("/tournaments/create")}><FaPlus /> Create Tournament</NavDropdown.Item>}
                      </NavDropdown>
                      <Nav.Link href={cerveauUrl}>Cerveau</Nav.Link>
                      <Nav.Link href={visUrl}>Viseur</Nav.Link>
                      </Nav>
                      <Nav>
                      {isAuthenticated ? (
                          <NavDropdown title={<><FaUser /> {user?.username}</>} id="user-dropdown" align="end">
                              <NavDropdown.Item disabled style={{ fontSize: 12, opacity: 0.7 }}>
                                  Role: {user?.role}
                              </NavDropdown.Item>
                              <NavDropdown.Divider />
                              <NavDropdown.Item onClick={handleLogout}>
                                  <FaRightFromBracket /> Log Out
                              </NavDropdown.Item>
                          </NavDropdown>
                      ) : (
                          <>
                              <Nav.Link href="/login" onClick={go("/login")}>Log In</Nav.Link>
                              <Nav.Link href="/register" onClick={go("/register")}>Register</Nav.Link>
                          </>
                      )}
                      </Nav>
                  </Navbar.Collapse>
              </Container>
          </Navbar>
        </div>
    );
}





export default Navigation;
