import React, { FC, useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';
import { ClientsResult } from '../../../models/ClientsResult';
import { getApiUrl, translateClientLanguage } from '../../../utils/utils';
import '../../shared/CreateForm.css';

interface CreatePlayerProps {}

const CreatePlayer: FC<CreatePlayerProps> = () => {
    const [nameValue, setNameValue] = useState('');
    const [clientIdValue, setClientIdValue] = useState('1');
    
    const [clients, setClients] = useState<ClientsResult[]>()
    
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');
    
    useEffect(() => {
        const apiUrl = getApiUrl();

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

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const name = encodeURI(nameValue);
        const clientId = encodeURI(clientIdValue);

        const apiUrl = getApiUrl();

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

    const alertVariant = hasError ? 'danger' : hasWarning ? 'warning' : 'success';

    return (
        <div className="create-page">
            <h2 className="create-page__title">New player</h2>
            <form className="create-card" onSubmit={handleSubmit}>
                <div className="create-card__section">
                    <label className="create-card__label" htmlFor="playerName">Name</label>
                    <input
                        id="playerName"
                        className="form-control"
                        type="text"
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        placeholder="Enter player name"
                    />
                </div>

                <div className="create-card__section">
                    <label className="create-card__label" htmlFor="playerClient">Client</label>
                    <select
                        id="playerClient"
                        className="form-select"
                        value={clientIdValue}
                        onChange={e => setClientIdValue(e.target.value)}
                    >
                        {clients?.map((client) => (
                            <option value={client.ID} key={client.ID}>
                                {client.game} &middot; {translateClientLanguage(client.language)} &middot; {client.repo}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="create-card__footer">
                    <button className="create-card__submit" type="submit">
                        <FaPlus size={12} />
                        Create player
                    </button>
                </div>

                {hasApiResponse && (
                    <Alert variant={alertVariant} className="create-card__alert">
                        {alertText}
                    </Alert>
                )}
            </form>
        </div>
    );
}

export default CreatePlayer;
