import React, { FC, useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa6';
import { PlayersResult } from '../../../models/PlayersResult';

interface CreateTournamentProps {}

const CreateTournament: FC<CreateTournamentProps> = () => {
    const [typeValue, setTypeValue] = useState('swiss');
    const [playerOneValue, setPlayerOneValue] = useState('');
    const [playerTwoValue, setPlayerTwoValue] = useState('');
    const [playerThreeValue, setPlayerThreeValue] = useState('');
    const [playerFourValue, setPlayerFourValue] = useState('');
    const [playerFiveValue, setPlayerFiveValue] = useState('');
    const [playerSixValue, setPlayerSixValue] = useState('');
    const [playerSevenValue, setPlayerSevenValue] = useState('');
    const [playerEightValue, setPlayerEightValue] = useState('');
    const [playersValue, setPlayersValue] = useState('');

    const [players, setPlayers] = useState<PlayersResult[]>();
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    // Helper function to shuffle an array
    const shuffleArray = (array: any[]) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    // Helper function to update player selection and prevent duplicates
    const updatePlayerValue = (playerId: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        // Remove current value from selected set if it exists
        const currentValue = setter.toString().split(' ').pop() || '';
        if (currentValue && selectedPlayerIds.has(currentValue)) {
            const newSet = new Set(selectedPlayerIds);
            newSet.delete(currentValue);
            setSelectedPlayerIds(newSet);
        }
        
        // Add new value to selected set
        if (playerId) {
            setter(playerId);
            const newSet = new Set(selectedPlayerIds);
            newSet.add(playerId);
            setSelectedPlayerIds(newSet);
        } else {
            setter('');
        }
        
        // Update the combined players value string
        updatePlayersValueFromState();
    };

    // Update combined players value from all individual player values
    const updatePlayersValueFromState = () => {
        const values = [
            playerOneValue, 
            playerTwoValue, 
            playerThreeValue, 
            playerFourValue, 
            playerFiveValue, 
            playerSixValue, 
            playerSevenValue, 
            playerEightValue
        ].filter(val => val !== '');
        
        setPlayersValue(values.join(','));
    };

    const handleTypeValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setTypeValue(event.target.value);
    }
    
    // Updated player change handlers to prevent duplicate selections
    const handlePlayerOneValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerOneValue);
    }
    
    const handlePlayerTwoValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerTwoValue);
    }
    
    const handlePlayerThreeValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerThreeValue);
    }
    
    const handlePlayerFourValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerFourValue);
    }
    
    const handlePlayerFiveValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerFiveValue);
    }
    
    const handlePlayerSixValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerSixValue);
    }
    
    const handlePlayerSevenValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerSevenValue);
    }
    
    const handlePlayerEightValueChange = (event: { target: { value: string; }; }) => {
        updatePlayerValue(event.target.value, setPlayerEightValue);
    }

    const updatePlayersValue = (player1: string, player2: string, player3: string, player4: string, player5: string, player6: string, player7: string, player8: string) => {
        const values = [player1, player2, player3, player4, player5, player6, player7, player8].filter(val => val !== '');
        setPlayersValue(values.join(','));
    }
    
    // Function to randomly select players
    const randomlySelectPlayers = () => {
        if (!players || players.length < 8) return;
        
        // Clear existing selections
        setSelectedPlayerIds(new Set());
        
        // Get 8 random players
        const shuffled = shuffleArray(players);
        const selectedPlayers = shuffled.slice(0, 8);
        
        // Update player values and selected IDs
        const newSelectedIds = new Set<string>();
        
        setPlayerOneValue(selectedPlayers[0]?.ID.toString() || '');
        if (selectedPlayers[0]) newSelectedIds.add(selectedPlayers[0].ID.toString());
        
        setPlayerTwoValue(selectedPlayers[1]?.ID.toString() || '');
        if (selectedPlayers[1]) newSelectedIds.add(selectedPlayers[1].ID.toString());
        
        setPlayerThreeValue(selectedPlayers[2]?.ID.toString() || '');
        if (selectedPlayers[2]) newSelectedIds.add(selectedPlayers[2].ID.toString());
        
        setPlayerFourValue(selectedPlayers[3]?.ID.toString() || '');
        if (selectedPlayers[3]) newSelectedIds.add(selectedPlayers[3].ID.toString());
        
        setPlayerFiveValue(selectedPlayers[4]?.ID.toString() || '');
        if (selectedPlayers[4]) newSelectedIds.add(selectedPlayers[4].ID.toString());
        
        setPlayerSixValue(selectedPlayers[5]?.ID.toString() || '');
        if (selectedPlayers[5]) newSelectedIds.add(selectedPlayers[5].ID.toString());
        
        setPlayerSevenValue(selectedPlayers[6]?.ID.toString() || '');
        if (selectedPlayers[6]) newSelectedIds.add(selectedPlayers[6].ID.toString());
        
        setPlayerEightValue(selectedPlayers[7]?.ID.toString() || '');
        if (selectedPlayers[7]) newSelectedIds.add(selectedPlayers[7].ID.toString());
        
        setSelectedPlayerIds(newSelectedIds);
        
        // Update combined players value
        const values = selectedPlayers.map(p => p.ID.toString());
        setPlayersValue(values.join(','));
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
        const apiUrl = process.env.REACT_APP_API_URL;

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

        const apiUrl = process.env.REACT_APP_API_URL;

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
            </>
        )
    }

    // Modified to disable already selected options
    const renderPlayer = (player: PlayersResult, keyContext: string) => {
        const isDisabled = selectedPlayerIds.has(player.ID.toString()) && 
                         (player.ID.toString() !== playerOneValue &&
                          player.ID.toString() !== playerTwoValue &&
                          player.ID.toString() !== playerThreeValue &&
                          player.ID.toString() !== playerFourValue &&
                          player.ID.toString() !== playerFiveValue &&
                          player.ID.toString() !== playerSixValue &&
                          player.ID.toString() !== playerSevenValue &&
                          player.ID.toString() !== playerEightValue);
                          
        return <option value={player.ID} key={`${keyContext}-${player.ID}`} disabled={isDisabled}>
            ID {player.ID} | {player.name} | Client {player.client.ID}
        </option>
    }

    return (
        <>
        <Form className="w-50" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="numGames">
                <Form.Label className="h5">Tournament Type</Form.Label>
                <Form.Select value={typeValue} onChange={handleTypeValueChange}>
                    {tournamentTypes.map((t) => {
                        return (
                            <option value={t.value} key={`type-${t.value}`}>{t.name}</option>
                        )
                    })}
                </Form.Select>
            </Form.Group>
            
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Players</h5>
                <Button variant="primary" onClick={randomlySelectPlayers} type="button">
                    Randomize Players
                </Button>
            </div>

            <Row>
                <Col>
                    <Form.Group className="mb-3" controlId="playerOne">
                        <Form.Label className="h5">Player One</Form.Label>
                        <Form.Select value={playerOneValue} onChange={handlePlayerOneValueChange}>
                            <option value="">Select a player</option>
                            {players?.map((player, i) => {
                                return renderPlayer(player, 'playerOne');
                            })}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col>
                <Form.Group className="mb-3" controlId="playerTwo">
                    <Form.Label className="h5">Player Two</Form.Label>
                    <Form.Select value={playerTwoValue} onChange={handlePlayerTwoValueChange}>
                        <option value="">Select a player</option>
                        {players?.map((player, i) => {
                            return renderPlayer(player, 'playerTwo');
                        })}
                    </Form.Select>
                </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Form.Group className="mb-3" controlId="playerThree">
                        <Form.Label className="h5">Player Three</Form.Label>
                        <Form.Select value={playerThreeValue} onChange={handlePlayerThreeValueChange}>
                            <option value="">Select a player</option>
                            {players?.map((player, i) => {
                                return renderPlayer(player, 'playerThree');
                            })}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col>
                <Form.Group className="mb-3" controlId="playerFour">
                    <Form.Label className="h5">Player Four</Form.Label>
                    <Form.Select value={playerFourValue} onChange={handlePlayerFourValueChange}>
                        <option value="">Select a player</option>
                        {players?.map((player, i) => {
                            return renderPlayer(player, 'playerFour');
                        })}
                    </Form.Select>
                </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Form.Group className="mb-3" controlId="playerFive">
                        <Form.Label className="h5">Player Five</Form.Label>
                        <Form.Select value={playerFiveValue} onChange={handlePlayerFiveValueChange}>
                            <option value="">Select a player</option>
                            {players?.map((player, i) => {
                                return renderPlayer(player, 'playerFive');
                            })}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col>
                <Form.Group className="mb-3" controlId="playerSix">
                    <Form.Label className="h5">Player Six</Form.Label>
                    <Form.Select value={playerSixValue} onChange={handlePlayerSixValueChange}>
                        <option value="">Select a player</option>
                        {players?.map((player, i) => {
                            return renderPlayer(player, 'playerSix');
                        })}
                    </Form.Select>
                </Form.Group>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Form.Group className="mb-3" controlId="playerSeven">
                        <Form.Label className="h5">Player Seven</Form.Label>
                        <Form.Select value={playerSevenValue} onChange={handlePlayerSevenValueChange}>
                            <option value="">Select a player</option>
                            {players?.map((player, i) => {
                                return renderPlayer(player, 'playerSeven');
                            })}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col>
                <Form.Group className="mb-3" controlId="playerEight">
                    <Form.Label className="h5">Player Eight</Form.Label>
                    <Form.Select value={playerEightValue} onChange={handlePlayerEightValueChange}>
                        <option value="">Select a player</option>
                        {players?.map((player, i) => {
                            return renderPlayer(player, 'playerEight');
                        })}
                    </Form.Select>
                </Form.Group>
                </Col>
            </Row>

            <Button variant="success" type="submit">
                <FaUserPlus className="me-2"></FaUserPlus>Create
            </Button>

            {renderAlerts()}
        </Form>
        </>
      );
}

export default CreateTournament;
