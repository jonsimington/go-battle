import React, { FC, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaDice } from 'react-icons/fa6';
import { getApiUrl } from '../../../utils/utils';
import { useApiResponse } from '../../../hooks/useApiResponse';
import '../../shared/CreateForm.css';

interface CreateRandomMatchProps {}

const CreateRandomMatch: FC<CreateRandomMatchProps> = () => {
    const [numGamesValue, setNumGamesValue] = useState('1');
    const api = useApiResponse();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/matches/random?num_games=${encodeURI(numGamesValue)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(response => api.handleResponse(response));
    }

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

                {api.showResponse && (
                    <Alert variant={api.alertVariant} className="create-card__alert">
                        {api.alertText}
                    </Alert>
                )}
            </form>
        </div>
    );
}

export default CreateRandomMatch;
