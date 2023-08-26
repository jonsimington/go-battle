import React, { FC, useEffect, useState } from 'react';
import styles from './CreateMatch.module.css';
import { PlayersResult } from '../../../models/PlayersResult';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { FaUserPlus } from 'react-icons/fa6';

interface CreateMatchProps {}

const CreateMatch: FC<CreateMatchProps> = () => {
    const [numGamesValue, setNumGames] = useState('');
    const [playerOneValue, setPlayerOneValue] = useState('1');
    const [playerTwoValue, setPlayerTwoValue] = useState('1');
    const [playersValue, setPlayersValue] = useState('1');

    const [players, setPlayers] = useState<PlayersResult[]>();

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleNumGamesValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setNumGames(event.target.value);
    }
    const handlePlayerOneValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerOneValue(event.target.value);
        updatePlayersValue(event.target.value.toString(), playerTwoValue);
    }
    const handlePlayerTwoValueChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setPlayerTwoValue(event.target.value);
        updatePlayersValue(playerOneValue, event.target.value.toString());
    }

    const updatePlayersValue = (player1: string, player2: string) => {
        setPlayersValue(`${player1},${player2}`);
    }

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

        const numGamesQuery = encodeURI(numGamesValue);
        const playersQuery = encodeURI(playersValue);

        fetch(`${apiUrl}/matches?num_games=${numGamesQuery}&players=${playersQuery}`, requestOptions)
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
        return <option value={player.id} key={`${keyContext}-${player.id}`}>ID {player.id} | {player.name} | Client {player.client_id}</option>
    }

    return (
        <>
        <Form className="w-50" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="numGames">
                <Form.Label className="h5">Number of Games</Form.Label>
                <Form.Select value={numGamesValue} onChange={handleNumGamesValueChange}>
                    <option value="1" key={`numGames-1`}>1</option>
                    <option value="2" key={`numGames-2`}>2</option>
                    <option value="3" key={`numGames-3`}>3</option>
                    <option value="4" key={`numGames-4`}>4</option>
                    <option value="5" key={`numGames-5`}>5</option>
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

            <Button variant="success" type="submit">
                <FaUserPlus className="me-2"></FaUserPlus>Create
            </Button>

            {renderAlerts()}
        </Form>
        </>
      );
}

export default CreateMatch;
