import React, { FC, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';
import { getApiUrl } from '../../../utils/utils';
import '../../shared/CreateForm.css';

interface CreateClientProps {}

const CreateClient: FC<CreateClientProps> = () => {
    const [repoUrlValue, setRepoUrlValue] = useState('');
    const [languageValue, setLanguageValue] = useState('py');
    const [gameValue, setGameValue] = useState('chess');
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const apiUrl = getApiUrl();

    const handleSubmit = (event: React.FormEvent) => {
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
                } else if (response.status === 500) {
                    setHasError(true);
                }
            })
    }

    const alertVariant = hasError ? 'danger' : hasWarning ? 'warning' : 'success';

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

                {hasApiResponse && (
                    <Alert variant={alertVariant} className="create-card__alert">
                        {alertText}
                    </Alert>
                )}
            </form>
        </div>
    );
}

export default CreateClient;
