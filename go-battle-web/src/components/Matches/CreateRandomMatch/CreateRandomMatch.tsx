import React, { FC, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaDice } from 'react-icons/fa6';
import { getApiUrl } from '../../../utils/utils';
import '../../shared/CreateForm.css';

interface CreateRandomMatchProps {}

const CreateRandomMatch: FC<CreateRandomMatchProps> = () => {
    const [numGamesValue, setNumGamesValue] = useState('1');
    
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

    const alertVariant = hasError ? 'danger' : hasWarning ? 'warning' : 'success';

    return (
        <div className="create-page">
            <h2 className="create-page__title">Random match</h2>
            <form className="create-card" onSubmit={handleSubmit}>
                <div className="create-card__section">
                    <label className="create-card__label" htmlFor="numGames">Games in match</label>
                    <select
                        id="numGames"
                        className="form-select"
                        value={numGamesValue}
                        onChange={e => setNumGamesValue(e.target.value)}
                    >
                        {Array.from({ length: 10 }, (_, n) => (
                            <option value={n + 1} key={`numGames-${n + 1}`}>{n + 1}</option>
                        ))}
                    </select>
                    <span className="create-card__hint">Players will be selected randomly</span>
                </div>

                <div className="create-card__footer">
                    <button className="create-card__submit" type="submit">
                        <FaDice size={12} />
                        Create random match
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

export default CreateRandomMatch;
