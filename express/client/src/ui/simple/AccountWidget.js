import { useState, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import Overlay from 'react-bootstrap/Overlay';

function AccountWidget( {currentAccount, role} ) {
    const [show, setShow] = useState(false);
    const target = useRef(null);

    return (
        <>
            <Button variant="info" ref={target} onClick={() => setShow(!show)}>
                Account
            </Button>
            <Overlay target={target.current} show={show} placement="bottom">
                {({
                      placement: _placement,
                      arrowProps: _arrowProps,
                      show: _show,
                      popper: _popper,
                      hasDoneInitialMeasure: _hasDoneInitialMeasure,
                      ...props
                  }) => (
                    <div
                        {...props}
                        style={{
                            position: 'absolute',
                            backgroundColor: 'rgba(255, 100, 100, 0.85)',
                            padding: '2px 10px',
                            color: 'white',
                            borderRadius: 3,
                            ...props.style,
                        }}
                    >
                        {currentAccount}
                    </div>
                )}
            </Overlay>
        </>
    );
}

export default AccountWidget;