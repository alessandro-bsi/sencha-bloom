import Alert from 'react-bootstrap/Alert';

function SuccessAlert({ msg }) {
    return (
        <Alert key="success" variant="success">
            {msg}
        </Alert>
    );
}

export function ErrorAlert({ msg }){
    return (
        <Alert key="danger" variant="danger">
            {msg}
        </Alert>
    );

}

export default SuccessAlert;