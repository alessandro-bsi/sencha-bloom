import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Button from "react-bootstrap/Button";
import {useState} from "react";

function NewOrder({submitHandler}) {
    const [productName, setProductName] = useState();
    const [productDescription, setProductDescription] = useState();

    const handlerChangeProductName = (event) => {
        setProductName(event.target.value);
    }

    const handlerChangeProductDescription = (event) => {
        setProductDescription(event.target.value);
    }

    const newOrderHandler = async (event) => {
        event.preventDefault();
        console.log(productName, productDescription);
        submitHandler(event, productName, productDescription);
    }

    return (
        <Form>
            <Row>
                <Col xs="auto">
                    <Form.Control placeholder="Product Name" onChange={handlerChangeProductName}/>
                </Col>
                <Col xs="auto">
                    <Form.Control placeholder="Product Description" onChange={handlerChangeProductDescription}/>
                </Col>
                <Col xs="auto">
                    <Button variant="primary" type="submit" onClick={newOrderHandler} onSubmit={newOrderHandler}>
                        Order
                    </Button>
                </Col>
            </Row>
        </Form>

    );
}

export default NewOrder;