import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import AccountWidget from "./AccountWidget";
import Button from "react-bootstrap/Button";


const NavigationBar = ({ currentAccount, mainHandler = null }) => {

    // style={{backgroundSize: "0", backgroundColor: "#BBBBCC"}}
    return (
        <Navbar expand="lg" className="bg-body-tertiary" bg="dark" data-bs-theme="dark" variant="dark">
            <Container>
                <Navbar.Brand href="#">CDS 2024: Supply Chain on Blockchain</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link href="/">Home</Nav.Link>
                        <NavDropdown title="Actions" id="basic-nav-dropdown">
                            <NavDropdown.Item href="/roles">
                                Roles
                            </NavDropdown.Item>
                            <NavDropdown.Item href="/orders">
                                Orders
                            </NavDropdown.Item>
                            <NavDropdown.Item href="/operations">
                                Operations
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="/tracking">
                                Tracking
                            </NavDropdown.Item>
                        </NavDropdown>
                        {
                            mainHandler !== null &&
                            <Button variant="light" onClick={(event) => mainHandler(event)}>Auto-Generate</Button>
                        }
                    </Nav>
                </Navbar.Collapse>
                <Navbar.Collapse className="justify-content-end">
                    <AccountWidget currentAccount={currentAccount}/>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;