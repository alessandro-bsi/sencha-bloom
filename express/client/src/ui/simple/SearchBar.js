import Navbar from 'react-bootstrap/Navbar';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import React, {useState} from "react";
import {ShowTrackingModal} from "./Modals";
import {loadProductInfo} from "../../common/utils";

function SearchBar({currentAccount}) {
    const [searchValue, setSearchValue] = useState("");
    const [show, setShow] = useState(false);
    const [product, setProduct] = useState(null);

    const handleClose = () => setShow(false);
    const handleShow = async (event) => {
        event.preventDefault();
        try{
            let productId = parseInt(searchValue.trim(), 10);
            let product = await loadProductInfo(productId);
            if(product !== null && product !== undefined){
                setProduct(product);
                setShow(true);
            }else{
                throw Error("Not found ");
            }

        }
        catch(error){
            window.alert("Not found");
        }
    }

    const handlerChangeSearchValue = (event) => {
        setSearchValue(event.target.value);
    }

    return (
        <div>
        <Navbar className="bg-body-tertiary justify-content-between">
            <Form inline="true" onSubmit={(e) => handleShow(e)}>
                <Row>
                    <Col xs="auto">
                        <Form.Control
                            type="text"
                            placeholder="Product Id"
                            className=" mr-sm-2"
                            onChange={(e) => handlerChangeSearchValue(e)}
                        />
                    </Col>
                    <Col xs="auto">
                        <Button type="submit">Track</Button>
                    </Col>
                </Row>
            </Form>
        </Navbar>

        <ShowTrackingModal
            show={show}
            onHide={handleClose}
            productObject={product}
            currentAccount={currentAccount}
        />
        </div>

    );
}

export default SearchBar;