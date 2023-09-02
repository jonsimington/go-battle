import styles from './SearchMatches.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay, FaSpinner, FaX } from 'react-icons/fa6';
import { Badge, Button, Col, Container, Dropdown, Modal, OverlayTrigger, Row, Toast, Tooltip } from 'react-bootstrap';
import { delay, elapsedTime, pluck, prettyDate, prettyTimeAgo, slugify } from '../../../utils/utils';
import { useEffect, useState } from 'react';
import { COLORS } from '../../../utils/colors';
import moment from 'moment';
import TimeAgo from 'timeago-react';

interface SearchMatchesProps {
    tableData: any[]
    refreshData: Function
}

interface PlayerScore {
    name: string;
    id: number;
    wins: number;
    losses: number;
    draws: number;
    elo: number;
}

interface MatchStartTime {
    id: number;
    startTime: Date;
}

const modalHeaderStyles = {
    background: COLORS.dark.primary,
    color: COLORS.dark.text.primary,
    border: "1px solid rgba(0, 0, 0, 0.175)",
}
const modalBodyStyles = {
    background: COLORS.dark.secondary,
    color: COLORS.dark.text.primary,
    border: "1px solid rgba(0, 0, 0, 0.175)",
}
const modalFooterStyles = {
    background: COLORS.dark.primary,
    color: COLORS.dark.text.primary,
    border: "1px solid rgba(0, 0, 0, 0.175)",
}
const modalStyles = {

}
const toastStyles = {
    maxWidth: "95%",
    minWidth: "75%"
}

const allPlayersHaveSameScore = (players: PlayerScore[]) => {
    if (players.length !== 2) {
        throw("Assumed only two players per match");
    } else {
        return players[0].wins === players[1].wins;
    }
}

export function SearchMatches({ tableData, refreshData }: SearchMatchesProps): JSX.Element {
    const [data, setData] = useState(tableData);
    const [matchesPlaying, setMatchesPlaying] = useState<number[]>([]);
    const [matchStartTimes, setMatchStartTimes] = useState<MatchStartTime[]>([]);
    const [matchIdToDelete, setMatchIdToDelete] = useState(-1);
    const [lastSortSetting, setLastSortSetting] = useState('status');

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

    useEffect(() => {
        sortData("created-desc", {})
    }, []);

    const columns: IColumnType<MatchesResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "numGames",
            title: "# Games",
            width: 100,
        },
        {
            key: "games",
            title: "Games",
            width: 100,
            render: (_, { games, ID }) => {
                const gameIds = games.map(pluck('ID')).join(', ');

                if(gameIds.length > 0) {
                    return (
                        <Button 
                            variant="outline-info" 
                            size="sm" 
                            key={`games-${ID}`}
                            href={`${window.location.origin}/games/search?ids=${encodeURI(gameIds)}`}>
                                {gameIds}
                        </Button>
                    )
                }
                else {
                    return (
                        <span>No Games Yet</span>
                    )
                }
            }
        },
        {
            key: "players",
            title: "Players",
            render: (_, { players, games, ID }) => {
                const playerIds = players.map(pluck('ID')).join(', ');
                const playerNames = players.map(pluck('name'));

                let playerScores: PlayerScore[] = [];

                playerNames.forEach(playerName => {
                    let playerWins = games.filter((g) => g.winner?.name === playerName).length;
                    let playerLosses = games.filter((g) => g.loser?.name === playerName).length;
                    let playerDraws = games.filter((g) => g.draw === true).length * 0.5
                    let playerID = players.filter((p) => p.name === playerName)[0].ID
                    let playerELO = players.filter((p) => p.name === playerName)[0].elo
                    playerScores.push({
                        name: playerName,
                        wins: playerWins,
                        losses: playerLosses,
                        draws: playerDraws,
                        id: playerID,
                        elo: playerELO
                    } as PlayerScore)
                });

                playerScores.sort((a, b) => a.wins < b.wins ? -1 : a.wins > b.wins ? 0 : 1)

                if(playerIds.length > 0) {
                    return (
                        <>
                            {playerScores.map((score) => {
                                let badgeColor = allPlayersHaveSameScore(playerScores) ? "outline-secondary" : playerScores[playerScores.length - 1]?.name === score.name ? "outline-success" : "outline-danger";
                                let badgeKey = `player-score-badge-${slugify(score.name)}-${ID}`;
                                let aKey = `player-score-a-${slugify(score.name)}-${ID}`;
                                let playersLink = `${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`;

                                return (
                                    <a href={playersLink} key={aKey}>
                                        <OverlayTrigger placement="top" overlay={renderPlayerRecordTooltip(score)}>
                                            <Button variant={badgeColor} size="sm" className="mx-1 my-1" key={badgeKey}>{score.name} ({score.elo}): {score.wins + score.draws}</Button>
                                        </OverlayTrigger>
                                    </a>
                                )
                            })}
                        </>
                    )
                }
                else {
                    return (
                        <span>No Players</span>
                    )
                }
            }
        },
        {
            key: "CreatedAt",
            title: "Created",
            width: 150,
            render: (_, { CreatedAt }) => {
                return (
                    <OverlayTrigger placement="top" overlay={renderDateTooltip(CreatedAt)}>
                        <span>{moment(CreatedAt.toString()).fromNow()}</span>
                    </OverlayTrigger>
                )
            }
        },
        {
            key: "UpdatedAt",
            title: "Updated",
            width: 150,
            render: (_, { UpdatedAt }) => {
                return (
                    <OverlayTrigger placement="top" overlay={renderDateTooltip(UpdatedAt)}>
                        <span>{moment(UpdatedAt.toString()).fromNow()}</span>
                    </OverlayTrigger>
                )
            }
        },
        {
            key: "status",
            title: "Status",
            width: 125,
            render: (_, { status, start_time, end_time }) => {
                const elapsed = prettyTimeAgo(elapsedTime(start_time, end_time));
                
                if (status === "Complete") {
                    return (
                        <OverlayTrigger placement="top" overlay={renderElapsedMatchTimeTooltip(elapsed)}>
                            <span>{status}</span>
                        </OverlayTrigger>
                    )
                } else {
                    return status;
                }
            }
        },
        {
            key: "startMatch",
            title: "Play Match",
            width: 125,
            render: (_, { ID, status }) => {
                if(status === "Pending" && !matchesPlaying.includes(ID)) {
                    return (
                        <Button variant="outline-success" onClick={() => startMatch(ID)} key={`startMatchButton-${ID}`}>
                            <h3><FaCirclePlay /></h3>
                        </Button>
                    )
                } else if(status == "In Progress" || matchesPlaying.includes(ID)) {
                    return (
                        <>
                            <div className="row d-inline-flex">
                                <Button variant="outline-info" key={`matchPlayingIcon-${ID}`}>
                                    <h3><FaSpinner  className="icon-spin" /></h3>
                                </Button>
                            </div>
                            <div className="row">
                                <TimeAgo datetime={matchStartTimes.filter((m) => m.id == ID)[0]?.startTime ?? new Date()} opts={{minInterval: 1}} className="mt-1" />
                            </div>
                        </>
                    )
                }
            }
        },
        {
            key: "deleteMatch",
            title: "Delete Match",
            width: 110,
            render: (_, { ID }) => {
                return (
                    <>
                        <Button variant="outline-danger" onClick={() => deleteMatch(ID)} key={`deleteMatchButton-${ID}`}>
                            <h3><FaX /></h3>
                        </Button>
                    </>
                )
            }
        },
    ];

    const handleFetchResponse = async (response: Response) => {
        setShowToast(true);
        const responseText = await response.text();
        setAlertText(`HTTP ${response.status}: ${responseText}`);

        if (response.ok) {
            setHasWarning(false);
            setHasError(false);
        } else if (response.status === 400) {
            setHasWarning(true);
        } else if (response.status === 500) {
            console.error(response.text);
            setHasError(true);
            return Promise.reject()
        }
    }

    const startMatch = (matchID: number) =>  {
        setMatchesPlaying([...matchesPlaying, matchID]);
        setMatchStartTimes([...matchStartTimes, {
            id: matchID,
            startTime: new Date(),
        }]);

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = process.env.REACT_APP_API_URL;

        fetch(`${apiUrl}/matches/start?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
            })
            .then(() => {
                refreshData();
                setMatchesPlaying(matchesPlaying.filter((mID) => mID != matchID));
            });
    }

    const deleteMatch = (matchID: number) =>  {
        setMatchIdToDelete(matchID);
        setShowConfirmDeleteModal(true);
    }

    const confirmDeleteMatch = (matchID: number) => {
        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = process.env.REACT_APP_API_URL;

        fetch(`${apiUrl}/matches?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(() => setShowConfirmDeleteModal(false))
            .then(() => removeMatchFromTable(matchID));
    }

    const removeMatchFromTable = (matchID: number) => {
        setData(data.filter((m: MatchesResult) => m.ID != matchID));
        refreshData();
    }

    const sortData = (eventKey: any, event: Object) => {
        let sortedData = [...data] as MatchesResult[];

        setLastSortSetting(eventKey);

        if(eventKey === "created") {
            sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
        }
        else if(eventKey === "created-desc") {
            sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
        }
        else if(eventKey === "updated") {
            sortedData.sort((a, b) => a.UpdatedAt < b.UpdatedAt ? -1 : a.UpdatedAt > b.UpdatedAt ? 1 : 0)
        }
        else if(eventKey === "numGames") {
            sortedData.sort((a, b) => a.numGames < b.numGames ? -1 : a.numGames > b.numGames ? 1 : 0)
        }
        else if(eventKey === "status") {
            sortedData.sort((a, b) => a.status > b.status ? -1 : a.status < b.status ? 0 : 1)
        }

        setData(sortedData);
    }

    const renderConfirmDeleteModal = (title: string, body: string) => {
        return (
            <Modal show={showConfirmDeleteModal} onHide={() => setShowConfirmDeleteModal(false)} style={modalStyles}>
                <Modal.Header style={modalHeaderStyles} closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>

                <Modal.Body style={modalBodyStyles}>
                    <p>{body}</p>
                </Modal.Body>

                <Modal.Footer style={modalFooterStyles}>
                    <Button variant="secondary" onClick={() => setShowConfirmDeleteModal(false)}>Close</Button>
                    <Button variant="danger" onClick={() => confirmDeleteMatch(matchIdToDelete)}>Delete</Button>
                </Modal.Footer>
            </Modal>
        )
    }

    const renderPlayerRecordTooltip = (player: PlayerScore) => {
        return (
            <Tooltip id={`tooltip-${slugify(player.name)}`} style={{position:"fixed"}}>
                Wins: {player.wins} | Losses: {player.losses} | Draws: {player.draws * 2}
            </Tooltip>
        )
    }

    const renderDateTooltip = (date: Date) => {
        return (
            <Tooltip id={`tooltip-date-${date}`} style={{position:"fixed"}}>
                {prettyDate(date.toString())}
            </Tooltip>
        )
    }

    const renderElapsedMatchTimeTooltip = (time: string) => {
        return (
            <Tooltip id={`tooltip-elapsedTime-${time}`} style={{position:"fixed"}}>
                Elapsed Time: {time}
            </Tooltip>
        )
    }

    return (
        <>
            {renderConfirmDeleteModal(`Delete Match ${matchIdToDelete}?`, `Are you sure you want to delete Match ${matchIdToDelete}?  This is permanent.`)}

            <Container className="pb-3">
                <Row className="text-center">
                    <Col>
                        <h3>Matches</h3>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <Dropdown autoClose={false} onSelect={sortData}>
                            <Dropdown.Toggle variant="outline-info" id="dropdown-basic">
                                Sort By
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                                <Dropdown.Item eventKey="created">Created</Dropdown.Item>
                                <Dropdown.Item eventKey="updated">Updated</Dropdown.Item>
                                <Dropdown.Item eventKey="numGames"># Games</Dropdown.Item>
                                <Dropdown.Item eventKey="status">Status</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Row>
            </Container>

            <Toast className="my-3"
                bg={hasError ? "danger" : hasWarning ? "warning" : "success"}
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={5000}
                animation={true}
                style={toastStyles}
                autohide>
                <Toast.Body>{alertText}</Toast.Body>
            </Toast>

            <DynamicTable data={data} columns={columns} />
        </>
    );
}
