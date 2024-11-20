import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import {useState} from "react";
import {updateActor} from "../../common/utils";

function NewActorForm({ mainHandler }) {
    const [formName, setName] = useState('');
    const [formBusinessAddress, setBusinessAddress] = useState('');
    const [formBusinessAddress2, setBusinessAddress2] = useState('');
    const [formBusinessCity, setBusinessCity] = useState('');
    const [formBusinessZip, setBusinessZip] = useState('');
    const [formEthAddress, setEthAddress] = useState('');
    const [formRole, setRole] = useState('');

    const options = [
        {value: '', text: '--Choose an option--'},
        {value: 'Provider', text: 'Provider'},
        {value: 'Supplier', text: 'Supplier'},
        {value: 'Manufacturer', text: 'Manufacturer'},
        {value: 'Distributor', text: 'Distributor'},
        {value: 'Retailer', text: 'Retailer'}
    ];

    const handleSubmit = async (event) => {
        // Handle form submission
        let fullAddress = formBusinessAddress + ' ' + formBusinessAddress2 + ' - ' + formBusinessZip + ' ' + formBusinessCity;

        event.preventDefault();
        mainHandler(event, formEthAddress, formRole, formName, fullAddress);
    };

    return (
        <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formGridEthAddress" onChange={(e) => setEthAddress(e.target.value)}>
                    <Form.Label>ETH Address</Form.Label>
                    <Form.Control placeholder="0xff......ff" />
                </Form.Group>

                <Form.Group as={Col} controlId="formGridName" onChange={(e) => setName(e.target.value)}>
                    <Form.Label>Name</Form.Label>
                    <Form.Control type="name" placeholder="Name" />
                </Form.Group>
            </Row>

            <Form.Group className="mb-3" controlId="formGridAddress1" onChange={(e) => setBusinessAddress(e.target.value)}>
                <Form.Label>Business Address</Form.Label>
                <Form.Control placeholder="1234 Main St" />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formGridAddress2" onChange={(e) => setBusinessAddress2(e.target.value)}>
                <Form.Label>Business Address 2</Form.Label>
                <Form.Control placeholder="Apartment, studio, or floor" />
            </Form.Group>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formGridCity" onChange={(e) => setBusinessCity(e.target.value)}>
                    <Form.Label>City</Form.Label>
                    <Form.Control />
                </Form.Group>

                <Form.Group as={Col} controlId="formGridState" onChange={(e) => setRole(e.target.value)}>
                    <Form.Label>Role</Form.Label>
                    <Form.Select defaultValue={options[0].value} className="form-control">
                        {options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.text}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <Form.Group as={Col} controlId="formGridZip" onChange={(e) => setBusinessZip(e.target.value)}>
                    <Form.Label>Zip</Form.Label>
                    <Form.Control />
                </Form.Group>
            </Row>

            <Button variant="primary" type="submit">
                Submit
            </Button>
        </Form>
    );
}

export function EditActorForm({ currentAccount, actorObject }) {
    const [formName, setName] = useState('');
    const [formBusinessAddress, setBusinessAddress] = useState('');
    const [formBusinessAddress2, setBusinessAddress2] = useState('');
    const [formBusinessCity, setBusinessCity] = useState('');
    const [formBusinessZip, setBusinessZip] = useState('');
    const [actor, setActor] = useState(null);

    setActor(actorObject);
    setName(actorObject.name);
    setBusinessAddress(actorObject.businessAddress);

    const handleSubmit = async (event) => {
        // Handle form submission
        event.preventDefault();
        let fullAddress = formBusinessAddress + ' ' + formBusinessAddress2 + ' - ' + formBusinessZip + ' ' + formBusinessCity;
        await updateActor(actor, formName, fullAddress, currentAccount);
    };

    return (
        <Form onSubmit={handleSubmit}>
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
                    <Form.Control type="name" placeholder={actor.name} />
                </Form.Group>
            </Row>

            <Form.Group className="mb-3" controlId="formGridAddress1" onChange={(e) => setBusinessAddress(e.target.value)}>
                <Form.Label>Business Address</Form.Label>
                <Form.Control placeholder={actor.businessAddress} />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formGridAddress2" onChange={(e) => setBusinessAddress2(e.target.value)}>
                <Form.Label>Business Address 2</Form.Label>
                <Form.Control placeholder="" />
            </Form.Group>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formGridCity" onChange={(e) => setBusinessCity(e.target.value)}>
                    <Form.Label>City</Form.Label>
                    <Form.Control />
                </Form.Group>

                <Form.Group as={Col} controlId="formGridState">
                    <Form.Label>Role</Form.Label>
                    <Form.Control placeholder={actor.role} disabled/>
                </Form.Group>

                <Form.Group as={Col} controlId="formGridZip" onChange={(e) => setBusinessZip(e.target.value)}>
                    <Form.Label>Zip</Form.Label>
                    <Form.Control />
                </Form.Group>
            </Row>

            <Button variant="primary" type="submit">
                Submit
            </Button>
        </Form>
    );
}

export default NewActorForm;
