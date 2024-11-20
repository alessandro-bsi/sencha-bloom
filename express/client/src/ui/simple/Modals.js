import {EditActorForm} from "./ActorForm";
import {Modal} from "react-bootstrap";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import React, {useState} from "react";
import {acceptPhase, rejectPhase, updateActor} from "../../common/utils";
import Form from "react-bootstrap/Form";

function EditActorModal( { show, onHide, currentAccount, actorObject } ) {
    const [formName, setName] = useState('');
    const [formBusinessAddress, setBusinessAddress] = useState('');
    const [formBusinessAddress2, setBusinessAddress2] = useState('');
    const [formBusinessCity, setBusinessCity] = useState('');
    const [formBusinessZip, setBusinessZip] = useState('');
    const [actor, setActor] = useState(null);

    setActor(actorObject);
    setName(actorObject.name);
    setBusinessAddress(actorObject.businessAddress);

    const onSubmit = async (event) => {
        // Handle form submission
        event.preventDefault();
        let fullAddress = formBusinessAddress + ' ' + formBusinessAddress2 + ' - ' + formBusinessZip + ' ' + formBusinessCity;
        await updateActor(actor, formName, fullAddress, currentAccount);
    };

    return (
        <>
        {
            actorObject !== null
            && actorObject !== undefined
            && <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Modal heading</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={onSubmit}>
                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="formGridId">
                            <Form.Label>ETH Address</Form.Label>
                            <Form.Control defaultValue={actor.id} plaintext readOnly/>
                        </Form.Group>

                        <Form.Group as={Col} controlId="formGridEthAddress">
                            <Form.Label>ETH Address</Form.Label>
                            <Form.Control defaultValue={actor.ethAddress} plaintext readOnly/>
                        </Form.Group>

                        <Form.Group as={Col} controlId="formGridName" onChange={(e) => setName(e.target.value)}>
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="name" placeholder={actor.name}/>
                        </Form.Group>
                    </Row>

                    <Form.Group className="mb-3" controlId="formGridAddress1"
                                onChange={(e) => setBusinessAddress(e.target.value)}>
                        <Form.Label>Business Address</Form.Label>
                        <Form.Control placeholder={actor.businessAddress}/>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formGridAddress2"
                                onChange={(e) => setBusinessAddress2(e.target.value)}>
                        <Form.Label>Business Address 2</Form.Label>
                        <Form.Control placeholder=""/>
                    </Form.Group>

                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="formGridCity" onChange={(e) => setBusinessCity(e.target.value)}>
                            <Form.Label>City</Form.Label>
                            <Form.Control/>
                        </Form.Group>

                        <Form.Group as={Col} controlId="formGridState">
                            <Form.Label>Role</Form.Label>
                            <Form.Control placeholder={actor.role} disabled/>
                        </Form.Group>

                        <Form.Group as={Col} controlId="formGridZip" onChange={(e) => setBusinessZip(e.target.value)}>
                            <Form.Label>Zip</Form.Label>
                            <Form.Control/>
                        </Form.Group>
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={onSubmit}>
                    Save Changes
                </Button>
            </Modal.Footer>
        </Modal>
        }
        </>
    );
}

export function ShowTrackingModal( { show, onHide, productObject, currentAccount } ) {
    const onSubmit = async (event, _id) => {
        event.preventDefault();
        return await acceptPhase(_id, currentAccount);
    }
    const onReject = async (event, _id) => {
        event.preventDefault();
        return await rejectPhase(_id, currentAccount);
    }

    return (
        <>
            {productObject !== null &&
                <Modal show={show} onHide={onHide} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{productObject.id}: {productObject.name}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="tracking-grid">
                        <Container>
                            <Row>
                                <Col xs={6} md={4}>
                                    {productObject.phase}
                                </Col>
                                <Col xs={12} md={8}>
                                    {productObject.description}
                                </Col>
                            </Row>

                            {
                                Object.keys(productObject.tracking).map((phase, index) => (
                                    <Row>
                                        <Col xs={6} md={4}>
                                            {phase.charAt(0).toUpperCase() + phase.slice(1)}
                                        </Col>
                                        <Col xs={12} md={8}>

                                            ID: {productObject.tracking[phase].id} <br/>
                                            Name: {productObject.tracking[phase].name} <br/>
                                            Address: {productObject.tracking[phase].businessAddress} <br/>
                                        </Col>
                                    </Row>
                                ))
                            }
                        </Container>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={onHide}>
                            Close
                        </Button>
                        <Button variant="primary" onClick={(e) => {onSubmit(e, productObject.id)}}>
                            Accept Stage
                        </Button>
                        <Button variant="danger" onClick={(e) => {onReject(e, productObject.id)}}>
                            Reject Stage
                        </Button>
                    </Modal.Footer>
                </Modal>
            }
        </>
    );
}

export default EditActorModal;