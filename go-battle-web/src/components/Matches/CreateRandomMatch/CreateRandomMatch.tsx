import React, { FC, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa6';

interface CreateRandomMatchProps {}

const CreateRandomMatch: FC<CreateRandomMatchProps> = () => {
    const [numGamesValue, setNumGamesValue] = useState('1');
    
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');
    
    const handleNumGamesValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setNumGamesValue(event.target.value);
    }

    const apiUrl = process.env.REACT_APP_API_URL;

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const numGames = encodeURI(numGamesValue);

        fetch(`${apiUrl}/matches/random?num_games=${numGames}`, requestOptions)
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
        <h3>Create Match Between Random Players</h3>

        <Form className="w-50" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="repositoryLanguage">
                <Form.Label className="h5"># Games in Match</Form.Label>
                <Form.Select value={numGamesValue} onChange={handleNumGamesValueChange}>
                    {Array.from(Array(10).keys()).map((n) => {
                        return (
                            <option value={n + 1} key={`numGames-${n + 1}`}>{n + 1}</option>
                        )
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

export default CreateRandomMatch;
