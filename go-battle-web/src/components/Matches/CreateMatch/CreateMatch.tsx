import React, { FC, useEffect, useState } from 'react';
import { PlayersResult } from '../../../models/PlayersResult';
import { Alert } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';
import { getApiUrl } from '../../../utils/utils';
import { useApiResponse } from '../../../hooks/useApiResponse';
import '../../shared/CreateForm.css';

interface CreateMatchProps {}

const CreateMatch: FC<CreateMatchProps> = () => {
    const [numGamesValue, setNumGames] = useState('1');
    const [playerOneValue, setPlayerOneValue] = useState('1');
    const [playerTwoValue, setPlayerTwoValue] = useState('2');
    const [playersValue, setPlayersValue] = useState('1,2');
    const [players, setPlayers] = useState<PlayersResult[]>();
    const api = useApiResponse();

    const handlePlayerOneValueChange = (value: string) => {
        setPlayerOneValue(value);
        setPlayersValue(`${value},${playerTwoValue}`);
    }
    const handlePlayerTwoValueChange = (value: string) => {
        setPlayerTwoValue(value);
        setPlayersValue(`${playerOneValue},${value}`);
    }

    useEffect(() => {
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/players`, {mode:'cors'})
          .then(response => response.json())
          .then(json => { setPlayers(json); })
          .catch(error => {
            console.error(error);
            api.setShowResponse(true);
            api.setAlertText("Error fetching list of players");
        })
    }, []);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/matches?num_games=${encodeURI(numGamesValue)}&players=${encodeURI(playersValue)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(response => api.handleResponse(response));
    }

    const renderPlayerOption = (player: PlayersResult, keyContext: string) => (
        <option value={player.ID} key={`${keyContext}-${player.ID}`}>
            ID {player.ID} &middot; {player.name} &middot; Client {player.client.ID} &middot; {player.client.language}
        </option>
    );

    const alertVariant = api.alertVariant;

    return (
        <div className="create-page">
            <h2 className="create-page__title">New match</h2>
            <form className="create-card" onSubmit={handleSubmit}>
                <div className="create-card__section">
                    <label className="create-card__label" htmlFor="numGames">Games</label>
                    <select
                        id="numGames"
                        className="form-select"
                        value={numGamesValue}
                        onChange={e => setNumGames(e.target.value)}
                    >
                        {Array.from({ length: 10 }, (_, n) => (
                            <option value={n + 1} key={`numGames-${n + 1}`}>{n + 1}</option>
                        ))}
                    </select>
                </div>

                <hr className="create-card__divider" />

                <div className="create-card__row">
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="playerOne">Player 1</label>
                        <select
                            id="playerOne"
                            className="form-select"
                            value={playerOneValue}
                            onChange={e => handlePlayerOneValueChange(e.target.value)}
                        >
                            {players?.map(player => renderPlayerOption(player, 'playerOne'))}
                        </select>
                    </div>
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="playerTwo">Player 2</label>
                        <select
                            id="playerTwo"
                            className="form-select"
                            value={playerTwoValue}
                            onChange={e => handlePlayerTwoValueChange(e.target.value)}
                        >
                            {players?.map(player => renderPlayerOption(player, 'playerTwo'))}
                        </select>
                    </div>
                </div>

                <div className="create-card__footer">
                    <button className="create-card__submit" type="submit">
                        <FaPlus size={12} />
                        Create match
                    </button>
                </div>

                {api.showResponse && (
                    <Alert variant={alertVariant} className="create-card__alert">
                        {api.alertText}
                    </Alert>
                )}
            </form>
        </div>
    );
}

export default CreateMatch;
