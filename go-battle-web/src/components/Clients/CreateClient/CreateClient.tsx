import React, { FC, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';
import { getApiUrl } from '../../../utils/utils';
import { useApiResponse } from '../../../hooks/useApiResponse';
import '../../shared/CreateForm.css';

interface CreateClientProps {}

const CreateClient: FC<CreateClientProps> = () => {
    const [repoUrlValue, setRepoUrlValue] = useState('');
    const [languageValue, setLanguageValue] = useState('py');
    const [gameValue, setGameValue] = useState('chess');
    const api = useApiResponse();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/clients?repo_url=${encodeURI(repoUrlValue)}&language=${encodeURI(languageValue)}&game=${encodeURI(gameValue)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(response => api.handleResponse(response));
    }

    return (
        <div className="create-page">
            <h2 className="create-page__title">New client</h2>
            <form className="create-card" onSubmit={handleSubmit}>
                <div className="create-card__section">
                    <label className="create-card__label" htmlFor="repoUrl">Repository URL</label>
                    <input
                        id="repoUrl"
                        className="form-control"
                        type="url"
                        value={repoUrlValue}
                        onChange={e => setRepoUrlValue(e.target.value)}
                        placeholder="https://github.com/..."
                    />
                </div>

                <div className="create-card__row">
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="language">Language</label>
                        <select
                            id="language"
                            className="form-select"
                            value={languageValue}
                            onChange={e => setLanguageValue(e.target.value)}
                        >
                            <option value="py">Python</option>
                            <option value="js">JavaScript</option>
                        </select>
                    </div>

                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="game">Game</label>
                        <select
                            id="game"
                            className="form-select"
                            value={gameValue}
                            onChange={e => setGameValue(e.target.value)}
                        >
                            <option value="chess">Chess</option>
                        </select>
                    </div>
                </div>

                <div className="create-card__footer">
                    <button className="create-card__submit" type="submit">
                        <FaPlus size={12} />
                        Create client
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

export default CreateClient;
