import { Toast } from 'react-bootstrap';

interface ApiToastProps {
    show: boolean;
    onClose: () => void;
    variant: string;
    text: string;
}

const toastStyles = {
    maxWidth: "95%",
    minWidth: "75%",
};

export function ApiToast({ show, onClose, variant, text }: ApiToastProps): JSX.Element {
    return (
        <Toast
            className="my-3"
            bg={variant}
            onClose={onClose}
            show={show}
            delay={5000}
            animation={true}
            style={toastStyles}
            autohide
        >
            <Toast.Body>{text}</Toast.Body>
        </Toast>
    );
}
