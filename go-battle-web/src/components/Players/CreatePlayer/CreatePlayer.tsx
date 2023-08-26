import React, { FC, useEffect, useState } from 'react';
import styles from './CreatePlayer.module.css';
import { Alert, Button, Form } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa6';
import { ClientsResult } from '../../../models/ClientsResult';
import { translateClientLanguage } from '../../../utils/utils';

interface CreatePlayerProps {}

const CreatePlayer: FC<CreatePlayerProps> = () => {
    const [nameValue, setNameValue] = useState('');
    const [clientIdValue, setClientIdValue] = useState('1');
    
    const [clients, setClients] = useState<ClientsResult[]>()
    
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');
    
    const handleNameValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setNameValue(event.target.value);
    }

    const handleClientIdValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setClientIdValue(event.target.value);
    }
    
    const apiUrl = process.env.REACT_APP_API_URL;

    // fetch list of clients to populate dropdown
    useEffect(() => {
        fetch(`${apiUrl}/clients`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            setClients(json);
          })
          .catch(error => {
            console.error(error);
            setHasError(true);
            setAlertText("Error fetching list of clients");
        })
    }, []);

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const name = encodeURI(nameValue);
        const clientId = encodeURI(clientIdValue);

        fetch(`${apiUrl}/players?name=${name}&client_id=${clientId}`, requestOptions)
            .then(async response => {
                setHasApiResponse(true);
                const responseText = await response.text();
                setAlertText(`HTTP ${response.status}: ${responseText}`);
                
                if (response.ok) {
                    setHasWarning(false);
                    setHasError(false);
                } else if (response.status === 400) {
                    setHasWarning(true);
                } else if (response.status === 500) {
                    setHasError(true);
                }
            })
    }

    const renderAlerts = () => {
        return (
            <>
            {hasApiResponse && hasError &&
                <Alert key="danger" variant="danger" className="mt-2">
                    {alertText}
                </Alert>
            }
            {hasApiResponse && hasWarning &&
                <Alert key="warning" variant="warning" className="mt-2">
                    {alertText}
                </Alert>
            }
            {hasApiResponse && !hasError && !hasWarning &&
                <Alert key="success" variant="success" className="mt-2">
                    {alertText}
                </Alert>
            }
            </>
        )
    }

    return (
        <>
        <Form data-bs-theme="dark" className="w-50" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="repositoryUrl">
                <Form.Label className="h5">Player Name</Form.Label>
                <Form.Control type="text" value={nameValue} onChange={handleNameValueChange} />
            </Form.Group>

            <Form.Group className="mb-3" controlId="repositoryLanguage">
                <Form.Label className="h5">Client</Form.Label>
                <Form.Select value={clientIdValue} onChange={handleClientIdValueChange}>
                    {clients?.map((client, i) => {
                        return <option value={client.ID} key={client.ID}>{client.game} | {translateClientLanguage(client.language)} | {client.repo}</option>
                    })}
                </Form.Select>
            </Form.Group>

            <Button variant="success" type="submit">
                <FaUserPlus className="me-2"></FaUserPlus>Create
            </Button>

            {renderAlerts()}
        </Form>
        </>
    );
}

export default CreatePlayer;
