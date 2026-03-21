import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay, FaSpinner, FaTrash } from 'react-icons/fa6';
import { Toast } from 'react-bootstrap';
import { allPlayersHaveSameScore, calculatePlayerScores, delay, elapsedTime, getApiUrl, pluck, prettyTimeAgo } from '../../../utils/utils';
import { useState } from 'react';
import TimeAgo from 'timeago-react';
import { PlayerScore } from '../../../models/PlayerScore';
import { Modal } from '../../Common/Modal';
import EloBadge from '../../Common/ELO/ELOBadge';
import { useNavigate } from 'react-router-dom';
import styles from './SearchMatches.module.css';

interface SearchMatchesProps {
    tableData: any[]
    refreshData: Function
}

interface MatchStartTime {
    id: number;
    startTime: Date;
}

const toastStyles = {
    maxWidth: "95%",
    minWidth: "75%"
}

export function SearchMatches({ tableData, refreshData }: SearchMatchesProps): JSX.Element {
    const [matchesPlaying, setMatchesPlaying] = useState<number[]>([]);
    const [matchStartTimes, setMatchStartTimes] = useState<MatchStartTime[]>([]);
    const [matchIdToDelete, setMatchIdToDelete] = useState<number | null>(null);

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

    const navigate = useNavigate();

    const columns: IColumnType<MatchesResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "games",
            title: "Games",
            width: 80,
            render: (_, { games }) => {
                if (!games || games.length === 0) return <span className={styles.muted}>—</span>;
                const gameIds = games.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={styles.countLink}
                        onClick={() => navigate(`/games/search?ids=${encodeURI(gameIds)}`)}>
                        {games.length} game{games.length !== 1 ? 's' : ''}
                    </span>
                );
            }
        },
        {
            key: "players",
            title: "Players",
            render: (_, { players, games }) => {
                if (!players || players.length === 0) return <span className={styles.muted}>—</span>;

                const safeGames = games || [];
                const playerScores = calculatePlayerScores(safeGames, players);
                const allSame = allPlayersHaveSameScore(playerScores);
                const playerIds = players.map(pluck('ID')).join(', ');

                return (
                    <div className={styles.playerList}>
                        {playerScores.map((score) => {
                            const isLeader = !allSame && playerScores[0]?.name === score.name;
                            const colorClass = allSame ? styles.playerDraw
                                : isLeader ? styles.playerWinning
                                : styles.playerLosing;
                            const label = allSame ? 'draw'
                                : isLeader ? 'W'
                                : 'L';

                            return (
                                <span
                                    key={`ps-${score.id}`}
                                    className={`${styles.playerScore} ${colorClass}`}
                                    onClick={() => navigate(`/players/search?ids=${encodeURI(playerIds)}`)}
                                    title={`W: ${score.wins} | L: ${score.losses} | D: ${score.draws * 2}`}
                                >
                                    {score.name}
                                    <EloBadge elo={score.elo} eloHistory={score.elo_history} />
                                    <span className={styles.scoreValue}>{score.wins + score.draws}</span>
                                    <span className={styles.resultTag}>{label}</span>
                                </span>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            key: "status",
            title: "Status",
            width: 120,
            render: (_, { status, start_time, end_time }) => {
                const elapsed = (start_time && end_time) ? prettyTimeAgo(elapsedTime(start_time, end_time)) : '';
                const statusClass = status === "Complete" ? styles.statusComplete
                    : status === "In Progress" ? styles.statusInProgress
                    : styles.statusPending;
                return (
                    <span
                        className={`${styles.status} ${statusClass}`}
                        title={elapsed ? `Elapsed: ${elapsed}` : undefined}
                    >
                        {status || "Unknown"}
                    </span>
                );
            }
        },
        {
            key: "CreatedAt",
            title: "Created",
            width: 120,
            render: (_, { CreatedAt }) => {
                return <TimeAgo datetime={CreatedAt} className={styles.timeAgo} />;
            }
        },
        {
            key: "actions",
            title: "",
            width: 140,
            render: (_, { ID, status, start_time }) => {
                start_time = !start_time || start_time.toString() === "0001-01-01T00:00:00Z" ? new Date() : start_time;

                return (
                    <div className={styles.actions}>
                        {status === "Pending" && !matchesPlaying.includes(ID) && (
                            <button className={`${styles.actionBtn} ${styles.actionStart}`} onClick={() => startMatch(ID)} title="Start match">
                                <FaCirclePlay />
                            </button>
                        )}
                        {(status === "In Progress" || matchesPlaying.includes(ID)) && (
                            <span className={styles.spinning} title="In progress">
                                <FaSpinner className="icon-spin" />
                            </span>
                        )}
                        <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => confirmDelete(ID)} title="Delete match">
                            <FaTrash />
                        </button>
                    </div>
                );
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
            return Promise.reject();
        }
    }

    const startMatch = (matchID: number) => {
        setMatchesPlaying(prev => [...prev, matchID]);
        setMatchStartTimes(prev => [...prev, {
            id: matchID,
            startTime: new Date(),
        }]);

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/matches/start?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
            })
            .then(() => {
                refreshData();
                setMatchesPlaying(prev => prev.filter((mID) => mID !== matchID));
            });
    }

    const confirmDelete = (matchID: number) => {
        setMatchIdToDelete(matchID);
        setShowConfirmDeleteModal(true);
    }

    const deleteMatch = () => {
        if (!matchIdToDelete) return;

        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/matches?match_id=${matchIdToDelete}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
                setShowConfirmDeleteModal(false);
                setMatchIdToDelete(null);
                refreshData();
            })
            .catch(() => {
                setShowConfirmDeleteModal(false);
                setMatchIdToDelete(null);
            });
    }

    return (
        <>
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

            <DynamicTable data={tableData} columns={columns} />

            <Modal
                show={showConfirmDeleteModal}
                title={`Delete Match ${matchIdToDelete}?`}
                onHide={() => setShowConfirmDeleteModal(false)}
                primaryButton={{
                    variant: "danger",
                    text: "Delete",
                    onClick: deleteMatch
                }}
                secondaryButton={{
                    variant: "secondary",
                    text: "Cancel",
                    onClick: () => setShowConfirmDeleteModal(false)
                }}
            >
                <p>Are you sure you want to delete match #{matchIdToDelete}?</p>
            </Modal>
        </>
    );
}
