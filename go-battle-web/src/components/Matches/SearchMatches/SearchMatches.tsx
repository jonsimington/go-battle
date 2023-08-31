import styles from './SearchMatches.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay, FaX } from 'react-icons/fa6';
import { Badge, Button, Modal, Toast } from 'react-bootstrap';
import { pluck, prettyDate } from '../../../utils/utils';
import { useState } from 'react';
import { COLORS } from '../../../utils/colors';

interface SearchMatchesProps {
    tableData: any[]
    refreshData: Function
}

interface PlayerScore {
    name: string;
    id: number;
    wins: number;
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
            width: 125,
            render: (_, { games }) => {
                const gameIds = games.map(pluck('ID')).join(', ');

                if(gameIds.length > 0) {
                    return (
                        <a href={`${window.location.origin}/games/search?ids=${encodeURI(gameIds)}`}>{gameIds}</a>
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
                    let playerID = players.filter((p) => p.name === playerName)[0].ID
                    playerScores.push({
                        name: playerName,
                        wins: playerWins,
                        id: playerID
                    } as PlayerScore)
                });

                playerScores.sort((a, b) => a.wins < b.wins ? -1 : a.wins > b.wins ? 0 : 1)

                if(playerIds.length > 0) {
                    return (
                        <>
                            {playerScores.map((score) => {
                                let badgeColor = allPlayersHaveSameScore(playerScores) ? "secondary" : playerScores[playerScores.length - 1]?.name === score.name ? "success" : "danger";

                                return (
                                    <>
                                        <a href={`${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`} key={`player-score-a-${score.name}-${ID}`}>
                                            <Badge bg={badgeColor} className="mx-1" key={`player-score-badge-${score.name}-${ID}`}>{score.name}: {score.wins}</Badge>
                                        </a>
                                    </>
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
            title: "Created At",
            width: 200,
            render: (_, { CreatedAt }) => {
                return prettyDate(CreatedAt.toString())
            }
        },
        {
            key: "status",
            title: "Status",
            width: 125,
        },
        {
            key: "startMatch",
            title: "Start Match",
            width: 100,
            render: (_, { ID, status }) => {
                return (
                    <>
                        {status === "Pending" &&
                            <Button variant="outline-success" onClick={() => startMatch(ID)} key={`startMatchButton-${ID}`}>
                                <h3><FaCirclePlay /></h3>
                            </Button>
                        }
                    </>
                )
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

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

    const [matchIdToDelete, setMatchIdToDelete] = useState(-1);

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
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = process.env.REACT_APP_API_URL;

        fetch(`${apiUrl}/matches/start?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response));
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

    return (
        <>
        {renderConfirmDeleteModal(`Delete Match ${matchIdToDelete}?`, `Are you sure you want to delete Match ${matchIdToDelete}?  This is permanent.`)}
        <h3>Matches</h3>

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
