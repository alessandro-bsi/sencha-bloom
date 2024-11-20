import React, {useState} from 'react';
import 'reactjs-popup/dist/index.css';
import EditActorModal, {ShowTrackingModal} from "../simple/Modals";
import Button from "react-bootstrap/Button";
import {loadProductInfo} from "../../common/utils";

const Table = ({ data, handleEdit, tableName= "", headers = null, startIndex = 0}) => {
    if (!Array.isArray(data) || data.length === 0) {
        return <p>No data available</p>;
    }

    console.log(data[0]);
    if (headers === null){
        headers = Object.keys(data[0]);
    }
    headers = headers.slice(startIndex,)
    console.log(headers);


    return (
        <div>
            <h4>{tableName}</h4>
            <table className="table">
                <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index}>{header}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => (
                    <tr key={index} data-item={row} onClick={(event) => handleEdit(event)}>
                        {headers.map((header, index) => (
                            <td key={index}>{row[header]}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export const ProductTable = ({ currentAccount, data, tableName }) => {
    const [show, setShow] = useState(false);
    const [product, setProduct] = useState(null);

    const handleClose = () => setShow(false);
    const handleShow = async (event, _id) => {
        event.preventDefault();
        setShow(true);
        let productID = event.target.getAttribute("data-item");
        if (productID === undefined || productID === null){
            productID = _id;
        }
        productID = parseInt(productID, 10)
        console.log(productID)
        let product = await loadProductInfo(productID);
        setProduct(product);
        console.log(product);
        
    }

    if (!Array.isArray(data) || data.length === 0) {
        return <p>No orders available</p>;
    }

    const headers = Object.keys(data[0]).slice(7,);

    return (
        <>
        <div>
            <h4>{tableName}</h4>
            <table className="table">
                <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index}>{header}</th>
                    ))}
                    <th>Details</th>
                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => (
                    <tr key={index} data-item={row[0]} onClick={(event) => handleShow(event, row[0])}>
                        {headers.map((header, index) => (
                            <td key={index}>{row[header]}</td>
                        ))}
                        <td>
                            <Button variant="primary" onClick={(event) => handleShow(event, row[0])}>
                                Show
                            </Button>
                        </td>

                    </tr>
                ))}
                </tbody>
            </table>
        </div>

        {product !== null && product !== undefined && show &&
            <ShowTrackingModal
                show={show}
                onHide={handleClose}
                productObject={product}
                currentAccount={currentAccount}
            />
        }
        </>
    );

}

export const ActorTable = ({ currentAccount, data, tableName }) => {
    const [show, setShow] = useState(false);
    const [actor, setActor] = useState(null);

    const handleClose = () => setShow(false);
    const handleShow = async (event, _id) => {
        event.preventDefault();
        /*
        setShow(true);
        let actorID = event.target.getAttribute("data-item");
        if (actorID === undefined || actorID === null) {
            actorID = _id;
        }
        actorID = parseInt(actorID, 10)
        console.log(actorID)
        let actor = await loadActorInfo(actorID);
        setActor(actor);
        console.log(actor);
        */
    }

    if (!Array.isArray(data) || data.length === 0) {
        return <p>No orders available</p>;
    }

    const headers = Object.keys(data[0]).slice(4,);

    return (
        <>
            <div>
                <h4>{tableName}</h4>
                <table className="table">
                    <thead>
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                        <th>Details</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((row, index) => (
                        <tr key={index} data-item={row[1]} onClick={(event) => handleShow(event, row[1])}>
                            {headers.map((header, index) => (
                                <td key={index}>{row[header]}</td>
                            ))}
                            <td>
                                <Button variant="primary" disabled={true} onClick={(event) => handleShow(event, row[1])}>
                                    Show
                                </Button>
                            </td>

                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {actor !== null && actor !== undefined && show &&
                <EditActorModal
                    show={show}
                    onHide={handleClose}
                    actorObject={actor}
                    currentAccount={currentAccount}
                ></EditActorModal>
            }
        </>
    );
}

export default Table;
