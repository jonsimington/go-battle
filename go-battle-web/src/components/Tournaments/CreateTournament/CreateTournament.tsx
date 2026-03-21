import React, { FC, useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Row, Container } from 'react-bootstrap';
import { FaUserPlus, FaDice } from 'react-icons/fa6';
import { PlayersResult } from '../../../models/PlayersResult';
import './CreateTournament.css';
import { getApiUrl } from '../../../utils/utils';

interface CreateTournamentProps {}

const CreateTournament: FC<CreateTournamentProps> = () => {
    const [typeValue, setTypeValue] = useState('swiss');
    const [playersValue, setPlayersValue] = useState('');
    const [players, setPlayers] = useState<PlayersResult[]>();
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [maxPlayers, setMaxPlayers] = useState(24);
    const [playerValues, setPlayerValues] = useState<string[]>(Array(24).fill(''));

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleIncrementMaxPlayers = () => {
        if (maxPlayers < 24) {
            handleMaxPlayersChange({ target: { value: (maxPlayers + 1).toString() } } as React.ChangeEvent<HTMLInputElement>);
        }
    };

    const handleDecrementMaxPlayers = () => {
        if (maxPlayers > 8) {
            handleMaxPlayersChange({ target: { value: (maxPlayers - 1).toString() } } as React.ChangeEvent<HTMLInputElement>);
        }
    };

    // Helper function to shuffle an array
    const shuffleArray = (array: any[]) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    // Function to select top N players by ELO
    const selectTopPlayers = () => {
        if (!players || players.length < 8) return;
        
        // Clear existing selections
        setSelectedPlayerIds(new Set());
        
        // Sort players by ELO in descending order and take top N
        const sortedPlayers = [...players].sort((a, b) => (b.elo || 0) - (a.elo || 0));
        const selectedPlayers = sortedPlayers.slice(0, maxPlayers);
        
        // Update player values and selected IDs
        const newSelectedIds = new Set<string>();
        const newPlayerValues = Array(maxPlayers).fill('');
        
        selectedPlayers.forEach((player, index) => {
            newPlayerValues[index] = player.ID.toString();
            newSelectedIds.add(player.ID.toString());
        });
        
        setPlayerValues(newPlayerValues);
        setSelectedPlayerIds(newSelectedIds);
        setPlayersValue(selectedPlayers.map(p => p.ID.toString()).join(','));
    };

    // Function to select bottom N players by ELO
    const selectBottomPlayers = () => {
        if (!players || players.length < 8) return;
        
        // Clear existing selections
        setSelectedPlayerIds(new Set());
        
        // Sort players by ELO in ascending order and take bottom N
        const sortedPlayers = [...players].sort((a, b) => (a.elo || 0) - (b.elo || 0));
        const selectedPlayers = sortedPlayers.slice(0, maxPlayers);
        
        // Update player values and selected IDs
        const newSelectedIds = new Set<string>();
        const newPlayerValues = Array(maxPlayers).fill('');
        
        selectedPlayers.forEach((player, index) => {
            newPlayerValues[index] = player.ID.toString();
            newSelectedIds.add(player.ID.toString());
        });
        
        setPlayerValues(newPlayerValues);
        setSelectedPlayerIds(newSelectedIds);
        setPlayersValue(selectedPlayers.map(p => p.ID.toString()).join(','));
    };

    // Helper function to update player selection and prevent duplicates
    const updatePlayerValue = (playerId: string, index: number) => {
        const newPlayerValues = [...playerValues];
        
        // Remove current value from selected set if it exists
        if (playerValues[index] && selectedPlayerIds.has(playerValues[index])) {
            const newSet = new Set(selectedPlayerIds);
            newSet.delete(playerValues[index]);
            setSelectedPlayerIds(newSet);
        }
        
        // Add new value to selected set
        if (playerId) {
            newPlayerValues[index] = playerId;
            const newSet = new Set(selectedPlayerIds);
            newSet.add(playerId);
            setSelectedPlayerIds(newSet);
        } else {
            newPlayerValues[index] = '';
        }
        
        setPlayerValues(newPlayerValues);
        updatePlayersValueFromState(newPlayerValues);
    };

    // Update combined players value from all individual player values
    const updatePlayersValueFromState = (values: string[] = playerValues) => {
        setPlayersValue(values.filter(val => val !== '').join(','));
    };

    const handleTypeValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setTypeValue(event.target.value);
    }

    const handleMaxPlayersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        if (value >= 8 && value <= 24) {
            setMaxPlayers(value);
            // Update player values array length
            const newPlayerValues = [...playerValues.slice(0, value)];
            while (newPlayerValues.length < value) {
                newPlayerValues.push('');
            }
            setPlayerValues(newPlayerValues);
            // Update selected IDs to remove any that are now out of bounds
            const newSelectedIds = new Set<string>();
            newPlayerValues.forEach(id => {
                if (id) newSelectedIds.add(id);
            });
            setSelectedPlayerIds(newSelectedIds);
            updatePlayersValueFromState(newPlayerValues);
        }
    };

    // Function to randomly select players
    const randomlySelectPlayers = () => {
        if (!players || players.length < 8) return;
        
        // Clear existing selections
        setSelectedPlayerIds(new Set());
        
        // Get up to 24 random players
        const shuffled = shuffleArray(players);
        const selectedPlayers = shuffled.slice(0, Math.min(maxPlayers, players.length));
        
        // Update player values and selected IDs
        const newSelectedIds = new Set<string>();
        const newPlayerValues = Array(maxPlayers).fill('');
        
        selectedPlayers.forEach((player, index) => {
            newPlayerValues[index] = player.ID.toString();
            newSelectedIds.add(player.ID.toString());
        });
        
        setPlayerValues(newPlayerValues);
        setSelectedPlayerIds(newSelectedIds);
        setPlayersValue(selectedPlayers.map(p => p.ID.toString()).join(','));
    };

    const tournamentTypes = [
        {
            name: "Swiss",
            value: "swiss"
        },
        {
            name: "Round Robin",
            value: "round-robin"
        }
    ]

    // fetch list of clients to populate dropdown and select random players
    useEffect(() => {
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/players`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            setPlayers(json);
            // Randomize players once the data is loaded
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

    const handleSubmit = (event: any) => {
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

    const renderAlerts = () => {
        return (
            <>
            {hasApiResponse && hasError &&
                <Alert key="danger" variant="danger" className="mt-4">
                    {alertText}
                </Alert>
            }
            {hasApiResponse && hasWarning &&
                <Alert key="warning" variant="warning" className="mt-4">
                    {alertText}
                </Alert>
            }
            {hasApiResponse && !hasError && !hasWarning &&
                <Alert key="success" variant="success" className="mt-4">
                    {alertText}
                </Alert>
            }
            </>
        )
    }

    // Modified to disable already selected options
    const renderPlayer = (player: PlayersResult, index: number) => {
        const isDisabled = selectedPlayerIds.has(player.ID.toString()) && 
                         playerValues[index] !== player.ID.toString();
                          
        return (
            <option 
                value={player.ID} 
                key={`player-${index}-${player.ID}`} 
                disabled={isDisabled}
            >
                ID {player.ID} | {player.name} | Client {player.client.ID}
            </option>
        );
    }

    const renderPlayerSelect = (index: number) => {
        return (
            <Form.Group className="mb-3" controlId={`player${index + 1}`}>
                <Form.Label className="player-label">Player {index + 1}</Form.Label>
                <Form.Select 
                    value={playerValues[index]} 
                    onChange={(e) => updatePlayerValue(e.target.value, index)}
                    className="player-select"
                >
                    <option value="">Select a player</option>
                    {players?.map((player) => renderPlayer(player, index))}
                </Form.Select>
            </Form.Group>
        );
    }

    return (
        <Container className="create-tournament-container">
            <Form className="tournament-form" onSubmit={handleSubmit}>
                <Row className="mb-4">
                    <Col md={6}>
                        <Form.Group controlId="numGames">
                            <Form.Label className="h4 fw-bold">Tournament Type</Form.Label>
                            <Form.Select 
                                value={typeValue} 
                                onChange={handleTypeValueChange}
                                className="tournament-type-select"
                            >
                                {tournamentTypes.map((t) => (
                                    <option value={t.value} key={`type-${t.value}`}>{t.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group controlId="maxPlayers">
                            <Form.Label className="h4 fw-bold">Maximum Players</Form.Label>
                            <div className="d-flex align-items-center">
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={handleDecrementMaxPlayers}
                                    disabled={maxPlayers <= 8}
                                    className="me-2"
                                >
                                    -
                                </Button>
                                <Form.Control
                                    type="number"
                                    min={8}
                                    max={24}
                                    value={maxPlayers}
                                    onChange={handleMaxPlayersChange}
                                    style={{ width: '80px' }}
                                    className="text-center"
                                />
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={handleIncrementMaxPlayers}
                                    disabled={maxPlayers >= 24}
                                    className="ms-2"
                                >
                                    +
                                </Button>
                            </div>
                            <Form.Text className="text-muted">
                                Choose between 8 and 24 players
                            </Form.Text>
                        </Form.Group>
                    </Col>
                </Row>
                
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold m-0">Players</h4>
                    <div>
                        <Button 
                            variant="primary" 
                            onClick={randomlySelectPlayers} 
                            type="button"
                            className="randomize-btn me-2"
                        >
                            <FaDice className="me-2" />
                            Randomize Players
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={selectTopPlayers} 
                            type="button"
                            className="me-2"
                        >
                            Select Top Players
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={selectBottomPlayers} 
                            type="button"
                        >
                            Select Bottom Players
                        </Button>
                    </div>
                </div>

                <div className="players-grid">
                    {Array.from({ length: maxPlayers }, (_, i) => (
                        <div key={`player-select-${i}`} className="player-select-container">
                            {renderPlayerSelect(i)}
                        </div>
                    ))}
                </div>

                <Button variant="success" type="submit" className="submit-btn mt-4">
                    <FaUserPlus className="me-2" />Create Tournament
                </Button>

                {renderAlerts()}
            </Form>
        </Container>
    );
}

export default CreateTournament;
