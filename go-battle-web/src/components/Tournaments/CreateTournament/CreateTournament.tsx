import React, { FC, useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { FaPlus, FaDice, FaArrowUpWideShort, FaArrowDownWideShort, FaLock, FaLockOpen } from 'react-icons/fa6';
import { PlayersResult } from '../../../models/PlayersResult';
import '../../shared/CreateForm.css';
import { getApiUrl } from '../../../utils/utils';

interface CreateTournamentProps {}

const CreateTournament: FC<CreateTournamentProps> = () => {
    const [typeValue, setTypeValue] = useState('swiss');
    const [playersValue, setPlayersValue] = useState('');
    const [players, setPlayers] = useState<PlayersResult[]>();
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [maxPlayers, setMaxPlayers] = useState(24);
    const [playerValues, setPlayerValues] = useState<string[]>(Array(24).fill(''));

    const [lockedSlots, setLockedSlots] = useState<Set<number>>(new Set());

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleIncrementMaxPlayers = () => {
        if (maxPlayers < 24) {
            handleMaxPlayersChange((maxPlayers + 1).toString());
        }
    };

    const handleDecrementMaxPlayers = () => {
        if (maxPlayers > 8) {
            handleMaxPlayersChange((maxPlayers - 1).toString());
        }
    };

    const shuffleArray = (array: any[]) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const toggleLock = (index: number) => {
        setLockedSlots(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else if (playerValues[index]) next.add(index);
            return next;
        });
    };

    const applyPlayerSelection = (selectedPlayers: PlayersResult[], count: number) => {
        const newSelectedIds = new Set<string>();
        const newPlayerValues = Array(count).fill('');

        // Preserve locked slots
        const lockedIds = new Set<string>();
        lockedSlots.forEach(i => {
            if (i < count && playerValues[i]) {
                newPlayerValues[i] = playerValues[i];
                newSelectedIds.add(playerValues[i]);
                lockedIds.add(playerValues[i]);
            }
        });

        // Fill unlocked slots with non-locked players
        const available = selectedPlayers.filter(p => !lockedIds.has(p.ID.toString()));
        let ai = 0;
        for (let i = 0; i < count; i++) {
            if (lockedSlots.has(i) && newPlayerValues[i]) continue;
            if (ai < available.length) {
                newPlayerValues[i] = available[ai].ID.toString();
                newSelectedIds.add(available[ai].ID.toString());
                ai++;
            }
        }

        setPlayerValues(newPlayerValues);
        setSelectedPlayerIds(newSelectedIds);
        setPlayersValue(newPlayerValues.filter(val => val !== '').join(','));
    };

    const selectTopPlayers = () => {
        if (!players || players.length < 8) return;
        const sorted = [...players].sort((a, b) => (b.elo || 0) - (a.elo || 0));
        applyPlayerSelection(sorted.slice(0, maxPlayers), maxPlayers);
    };

    const selectBottomPlayers = () => {
        if (!players || players.length < 8) return;
        const sorted = [...players].sort((a, b) => (a.elo || 0) - (b.elo || 0));
        applyPlayerSelection(sorted.slice(0, maxPlayers), maxPlayers);
    };

    const randomlySelectPlayers = () => {
        if (!players || players.length < 8) return;
        const shuffled = shuffleArray(players);
        applyPlayerSelection(shuffled.slice(0, Math.min(maxPlayers, players.length)), maxPlayers);
    };

    const updatePlayerValue = (playerId: string, index: number) => {
        const newPlayerValues = [...playerValues];
        
        if (playerValues[index] && selectedPlayerIds.has(playerValues[index])) {
            const newSet = new Set(selectedPlayerIds);
            newSet.delete(playerValues[index]);
            setSelectedPlayerIds(newSet);
        }
        
        if (playerId) {
            newPlayerValues[index] = playerId;
            const newSet = new Set(selectedPlayerIds);
            newSet.add(playerId);
            setSelectedPlayerIds(newSet);
        } else {
            newPlayerValues[index] = '';
        }
        
        setPlayerValues(newPlayerValues);
        setPlayersValue(newPlayerValues.filter(val => val !== '').join(','));
    };

    const handleMaxPlayersChange = (rawValue: string) => {
        const value = parseInt(rawValue);
        if (value >= 8 && value <= 24) {
            setMaxPlayers(value);
            const newPlayerValues = [...playerValues.slice(0, value)];
            while (newPlayerValues.length < value) {
                newPlayerValues.push('');
            }
            setPlayerValues(newPlayerValues);
            const newSelectedIds = new Set<string>();
            newPlayerValues.forEach(id => {
                if (id) newSelectedIds.add(id);
            });
            setSelectedPlayerIds(newSelectedIds);
            setPlayersValue(newPlayerValues.filter(val => val !== '').join(','));
        }
    };

    const tournamentTypes = [
        { name: "Swiss", value: "swiss" },
        { name: "Round Robin", value: "round-robin" },
    ];

    useEffect(() => {
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/players`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            setPlayers(json);
            setTimeout(() => {
              if (json && json.length >= 8) {
                randomlySelectPlayers();
              }
            }, 100);
          })
          .catch(error => {
            console.error(error);
            setHasError(true);
            setAlertText("Error fetching list of players");
        })
    }, []);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const typeQuery = encodeURI(typeValue);
        const playersQuery = encodeURI(playersValue);

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/tournaments?type=${typeQuery}&players=${playersQuery}`, requestOptions)
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
        <div className="create-page create-page--wide">
            <h2 className="create-page__title">New tournament</h2>
            <form className="create-card" onSubmit={handleSubmit}>
                <div className="create-card__row">
                    <div className="create-card__section">
                        <label className="create-card__label" htmlFor="tournamentType">Type</label>
                        <select
                            id="tournamentType"
                            className="form-select"
                            value={typeValue}
                            onChange={e => setTypeValue(e.target.value)}
                        >
                            {tournamentTypes.map(t => (
                                <option value={t.value} key={`type-${t.value}`}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="create-card__section">
                        <label className="create-card__label">Max players</label>
                        <div className="create-card__stepper">
                            <button
                                type="button"
                                className="create-card__stepper-btn"
                                onClick={handleDecrementMaxPlayers}
                                disabled={maxPlayers <= 8}
                            >
                                &minus;
                            </button>
                            <span className="create-card__stepper-value">{maxPlayers}</span>
                            <button
                                type="button"
                                className="create-card__stepper-btn"
                                onClick={handleIncrementMaxPlayers}
                                disabled={maxPlayers >= 24}
                            >
                                +
                            </button>
                        </div>
                        <span className="create-card__hint">8 &ndash; 24 players</span>
                    </div>
                </div>

                <hr className="create-card__divider" />

                <div className="create-card__section-header">
                    <span className="create-card__section-title">Players</span>
                    <div className="create-card__actions">
                        <button type="button" className="create-card__action-btn" onClick={randomlySelectPlayers}>
                            <FaDice size={11} />
                            Randomize
                        </button>
                        <button type="button" className="create-card__action-btn" onClick={selectTopPlayers}>
                            <FaArrowUpWideShort size={11} />
                            Top ELO
                        </button>
                        <button type="button" className="create-card__action-btn" onClick={selectBottomPlayers}>
                            <FaArrowDownWideShort size={11} />
                            Bottom ELO
                        </button>
                    </div>
                </div>

                <div className="create-card__player-grid">
                    {Array.from({ length: maxPlayers }, (_, i) => {
                        const isLocked = lockedSlots.has(i) && !!playerValues[i];
                        return (
                        <div key={`player-select-${i}`} className={`create-card__player-slot${isLocked ? ' create-card__player-slot--locked' : ''}`}>
                            <div className="create-card__player-slot-header">
                                <div className="create-card__player-slot-label">Player {i + 1}</div>
                                {playerValues[i] && (
                                    <button
                                        type="button"
                                        className={`create-card__lock-btn${isLocked ? ' create-card__lock-btn--active' : ''}`}
                                        onClick={() => toggleLock(i)}
                                        title={isLocked ? 'Unlock' : 'Lock'}
                                    >
                                        {isLocked ? <FaLock size={9} /> : <FaLockOpen size={9} />}
                                    </button>
                                )}
                            </div>
                            <select
                                className="form-select"
                                value={playerValues[i]}
                                onChange={e => updatePlayerValue(e.target.value, i)}
                            >
                                <option value="">--</option>
                                {players?.map(player => {
                                    const isDisabled = selectedPlayerIds.has(player.ID.toString()) &&
                                        playerValues[i] !== player.ID.toString();
                                    return (
                                        <option
                                            value={player.ID}
                                            key={`player-${i}-${player.ID}`}
                                            disabled={isDisabled}
                                        >
                                            ID {player.ID} &middot; {player.name} &middot; Client {player.client.ID}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        );
                    })}
                </div>

                <div className="create-card__footer">
                    <button className="create-card__submit" type="submit">
                        <FaPlus size={12} />
                        Create tournament
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

export default CreateTournament;
