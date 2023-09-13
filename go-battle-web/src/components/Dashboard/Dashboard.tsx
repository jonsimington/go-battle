import { FC, useEffect, useState } from 'react';
import { Button, Card, Col, Container, ListGroup, Row } from 'react-bootstrap';
import { ApiResult } from '../../models/ApiResult';
import { PlayersResult } from '../../models/PlayersResult';
import { MatchesResult } from '../../models/MatchesResult';
import { GamesResult } from '../../models/GamesResult';
import { average, elapsedTime, prettyTimeAgo } from '../../utils/utils';

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
    let [players, setPlayers] = useState<PlayersResult[]>([]);
    let [topFivePlayers, setTopFivePlayers] = useState<PlayersResult[]>([]);
    let [matches, setMatches] = useState<MatchesResult[]>([]);
    let [games, setGames] = useState<GamesResult[]>([]);
    let [avgMatchLength, setAvgMatchLength] = useState<number>(0);

    const apiUrl = process.env.REACT_APP_API_URL;

    useEffect(() => {
        fetchFromApi("/games");
        fetchFromApi("/matches");
        fetchFromApi("/players");
    }, []);

    // set Top 5 Players when players changes
    useEffect(() => {
        let sortedPlayers = [...players].sort((a, b) => a.elo > b.elo ? -1 : a.elo < b.elo ? 1 : 0);
        setTopFivePlayers(sortedPlayers.slice(0, 5));
    }, [players]);

    // update match stats when matches changes
    useEffect(() => {
        if (matches.length > 0) {
            let matchElapsedTimes = matches.filter((m) => elapsedTime(m.start_time, m.end_time) > 0).map((m) => {
                return  elapsedTime(m.start_time, m.end_time);
            });
    
            setAvgMatchLength(average(matchElapsedTimes));
        }


    }, [matches]);

    const fetchFromApi = (path: string) => {
        let url = `${apiUrl}${path}`;

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: ApiResult[]) => {
            if(path.includes("players")) {
                setPlayers(json as PlayersResult[]);
            }
            else if(path.includes("games")) {
                setGames(json as GamesResult[]);
            }
            else if(path.includes("matches")) {
                setMatches(json as MatchesResult[]);
            }
          })
          .catch(error => console.error(error))
    }

    return (
        <Container>
            <Row>
                <Col lg="5">
                    <Card>
                        <Card.Header className="text-center">
                            <h3>Top 5 Players</h3>
                        </Card.Header>
                        <Card.Body>
                            <Card.Text className="text-center" as="div">
                                <ListGroup as="ol" numbered>
                                    {topFivePlayers.map((p) => {
                                        return (
                                            <ListGroup.Item
                                                as="li"
                                                className="d-flex justify-content-between align-items-start"
                                                variant="dark"
                                                key={`top5-${p.ID}`}
                                                action
                                            >
                                                <span className="ms-2 me-auto fw-bold">
                                                    {p.name}
                                                </span>
                                                <Button 
                                                    variant={`outline-secondary`} 
                                                    size="sm" 
                                                    key={`elo-${p.ID}`}
                                                    disabled={true}>
                                                        {p.elo}
                                                </Button>
                                            </ListGroup.Item>
                                        )
                                    })}
                                </ListGroup>
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col>
                    <Row>
                        <Col lg="6">
                            <Card>
                                <Card.Header className="text-center">
                                    <h3># Players</h3>
                                </Card.Header>
                                <Card.Body>
                                    <Card.Text className="text-center" as="div">
                                        <h1>{players.length}</h1>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg="6">
                            <Card>
                                <Card.Header className="text-center">
                                    <h3># Matches</h3>
                                </Card.Header>
                                <Card.Body>
                                    <Card.Text className="text-center" as="div">
                                        <h1>{matches.length}</h1>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                    <Col>
                            <Card>
                                <Card.Header className="text-center">
                                    <h3># Games</h3>
                                </Card.Header>
                                <Card.Body>
                                    <Card.Text className="text-center" as="div">
                                        <h1>{games.length}</h1>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col>
                            <Card>
                                <Card.Header className="text-center">
                                    <h3>Avg Match Length</h3>
                                </Card.Header>
                                <Card.Body>
                                    <Card.Text className="text-center" as="div">
                                        <h1>{prettyTimeAgo(avgMatchLength)}</h1>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    )
}

export default Dashboard;
