import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

function HeaderCard({header, title, content, linkAction, linkDisplay, footer = null}) {
    return (
        <Card>
            <Card.Header>{header}</Card.Header>
            <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>
                    {content}
                </Card.Text>
                <Button variant="primary" onClick={linkAction}>{linkDisplay}</Button>
                {
                    footer !== null &&
                    <Card.Footer className="text-muted">{footer}</Card.Footer>
                }
            </Card.Body>
        </Card>
    );
}

export default HeaderCard;