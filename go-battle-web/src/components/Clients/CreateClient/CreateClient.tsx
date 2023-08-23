import React, { FC, useState } from 'react';
import './CreateClient.css';
import { Alert, Button, Form } from 'react-bootstrap';
import { FaPlus, FaSpinner, FaUserPlus } from 'react-icons/fa6';

interface CreateClientProps {}

const CreateClient: FC<CreateClientProps> = (props) => {
    const [repoUrlValue, setRepoUrlValue] = useState('');
    const [languageValue, setlanguageValue] = useState('py');
    const [gameValue, setGameValue] = useState('chess');
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleRepoUrlChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setRepoUrlValue(event.target.value);
    }
    const handleLanguageValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setlanguageValue(event.target.value);
    }
    const handleGameValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setGameValue(event.target.value);
    }

    const apiUrl = process.env.REACT_APP_API_URL;

    const handleSubmit = (event: any) => {
        event.preventDefault();

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const repoUrl = encodeURI(repoUrlValue);
        const language = encodeURI(languageValue);
        const game = encodeURI(gameValue);

        fetch(`${apiUrl}/clients?repo_url=${repoUrl}&language=${language}&game=${game}`, requestOptions)
            .then(async response => {
                setHasApiResponse(true);
                const responseText = await response.text();
                setAlertText(`HTTP ${response.status}: ${responseText}`);
                
                if (response.ok) {
                    setHasWarning(false);
                    setHasError(false);
                } else if (response.status === 400) {
                    setHasWarning(true);
                } else if (response.status == 500) {
                    setHasError(true);
                }
            })
    }

    return (
        <>
        <Form data-bs-theme="dark" className="w-50" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="repositoryUrl">
                <Form.Label className="h5">Repository URL</Form.Label>
                <Form.Control type="url" value={repoUrlValue} onChange={handleRepoUrlChange} />
            </Form.Group>

            <Form.Group className="mb-3" controlId="repositoryLanguage">
                <Form.Label className="h5">Repository Language</Form.Label>
                <Form.Select value={languageValue} onChange={handleLanguageValueChange}>
                    <option value="py">Python</option>
                    <option value="js">JavaScript</option>
                </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="game">
                <Form.Label className="h5">Game</Form.Label>
                <Form.Select value={gameValue} onChange={handleGameValueChange}>
                    <option value="chess">Chess</option>
                </Form.Select>
            </Form.Group>

            <Button variant="success" type="submit">
                <FaUserPlus className="me-2"></FaUserPlus>Create
            </Button>

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
        </Form>
        </>
    );
}

export default CreateClient;
