import React, { FC, useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';
import { ClientsResult } from '../../../models/ClientsResult';
import { getApiUrl, translateClientLanguage } from '../../../utils/utils';
import { useApiResponse } from '../../../hooks/useApiResponse';
import '../../shared/CreateForm.css';

interface CreatePlayerProps {}

const CreatePlayer: FC<CreatePlayerProps> = () => {
    const [nameValue, setNameValue] = useState('');
    const [clientIdValue, setClientIdValue] = useState('1');
    const [clients, setClients] = useState<ClientsResult[]>();
    const api = useApiResponse();
    
    useEffect(() => {
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/clients`, {mode:'cors'})
          .then(response => response.json())
          .then(json => { setClients(json); })
          .catch(error => {
            console.error(error);
            api.setShowResponse(true);
            api.setAlertText("Error fetching list of clients");
        })
    }, []);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/players?name=${encodeURI(nameValue)}&client_id=${encodeURI(clientIdValue)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(response => api.handleResponse(response));
    }

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

                {api.showResponse && (
                    <Alert variant={api.alertVariant} className="create-card__alert">
                        {api.alertText}
                    </Alert>
                )}
            </form>
        </div>
    );
}

export default CreatePlayer;
