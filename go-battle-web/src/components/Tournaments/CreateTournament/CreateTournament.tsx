import React, { FC, useEffect, useState } from 'react';
import styles from './CreateMatch.module.css';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa6';
import { PlayersResult } from '../../../models/PlayersResult';

interface CreateTournamentProps {}

const CreateTournament: FC<CreateTournamentProps> = () => {
    const [typeValue, setTypeValue] = useState('swiss');
    const [playerOneValue, setPlayerOneValue] = useState('1');
    const [playerTwoValue, setPlayerTwoValue] = useState('2');
    const [playerThreeValue, setPlayerThreeValue] = useState('3');
    const [playerFourValue, setPlayerFourValue] = useState('4');
    const [playerFiveValue, setPlayerFiveValue] = useState('5');
    const [playerSixValue, setPlayerSixValue] = useState('6');
    const [playerSevenValue, setPlayerSevenValue] = useState('7');
    const [playerEightValue, setPlayerEightValue] = useState('8');
    const [playersValue, setPlayersValue] = useState('1,2,3,4,5,6,7,8');

    const [players, setPlayers] = useState<PlayersResult[]>();

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleTypeValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        console.log(`setting type from ${typeValue} to ${event.target.value}`);
        setTypeValue(event.target.value);
        console.log('tyype', typeValue);

    }
    const handlePlayerOneValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerOneValue(event.target.value);
        updatePlayersValue(event.target.value.toString(), playerTwoValue, playerThreeValue, playerFourValue, playerFiveValue, playerSixValue, playerSevenValue, playerEightValue);
    }
    const handlePlayerTwoValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerTwoValue(event.target.value);
        updatePlayersValue(playerOneValue, event.target.value.toString(), playerThreeValue, playerFourValue, playerFiveValue, playerSixValue, playerSevenValue, playerEightValue);
    }
    const handlePlayerThreeValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerThreeValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, event.target.value.toString(), playerFourValue, playerFiveValue, playerSixValue, playerSevenValue, playerEightValue);
    }
    const handlePlayerFourValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerFourValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, playerThreeValue, event.target.value.toString(), playerFiveValue, playerSixValue, playerSevenValue, playerEightValue);
    }
    const handlePlayerFiveValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerFiveValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, playerThreeValue, playerFourValue, event.target.value.toString(), playerSixValue, playerSevenValue, playerEightValue);
    }
    const handlePlayerSixValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerSixValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, playerThreeValue, playerFourValue, playerFiveValue, event.target.value.toString(), playerSevenValue, playerEightValue);
    }
    const handlePlayerSevenValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerSevenValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, playerThreeValue, playerFourValue, playerFiveValue, playerSixValue, event.target.value.toString(), playerEightValue);
    }
    const handlePlayerEightValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerEightValue(event.target.value);
        updatePlayersValue(playerOneValue, playerTwoValue, playerThreeValue, playerFourValue, playerFiveValue, playerSixValue, playerSevenValue, event.target.value.toString());
    }

    const updatePlayersValue = (player1: string, player2: string, player3: string, player4: string, player5: string, player6: string, player7: string, player8: string) => {
        setPlayersValue(`${player1},${player2},${player3},${player4},${player5},${player6},${player7},${player8}`);
    }

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

    const apiUrl = process.env.REACT_APP_API_URL;

    // fetch list of clients to populate dropdown
    useEffect(() => {
        fetch(`${apiUrl}/players`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            setPlayers(json);
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

    const renderPlayer = (player: PlayersResult, keyContext: string) => {
        return <option value={player.ID} key={`${keyContext}-${player.ID}`}>ID {player.ID} | {player.name} | Client {player.client.ID}</option>
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

            <Row>
                <Col>
                    <Form.Group className="mb-3" controlId="playerOne">
                        <Form.Label className="h5">Player One</Form.Label>
                        <Form.Select value={playerOneValue} onChange={handlePlayerOneValueChange}>
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
