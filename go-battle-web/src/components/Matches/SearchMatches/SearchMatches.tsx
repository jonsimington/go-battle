import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay, FaCircleStop, FaArrowRotateRight, FaSpinner, FaTrash } from 'react-icons/fa6';
import { allPlayersHaveSameScore, calculatePlayerScores, delay, elapsedTime, getApiUrl, pluck, prettyTimeAgo } from '../../../utils/utils';
import { apiFetch } from '../../../utils/apiFetch';
import { useState } from 'react';
import TimeAgo from 'timeago-react';
import { PlayerScore } from '../../../models/PlayerScore';
import { Modal } from '../../Common/Modal';
import { ApiToast } from '../../Common/ApiToast';
import EloBadge from '../../Common/ELO/ELOBadge';
import { useNavigate } from 'react-router-dom';
import { useApiResponse } from '../../../hooks/useApiResponse';
import { useConfirmDelete } from '../../../hooks/useConfirmDelete';
import s from '../../shared/SearchTable.module.css';

interface SearchMatchesProps {
    tableData: any[]
    refreshData: Function
}

interface MatchStartTime {
    id: number;
    startTime: Date;
}

export function SearchMatches({ tableData, refreshData }: SearchMatchesProps): JSX.Element {
    const [matchesPlaying, setMatchesPlaying] = useState<number[]>([]);
    const [matchStartTimes, setMatchStartTimes] = useState<MatchStartTime[]>([]);
    const [matchesStopping, setMatchesStopping] = useState<number[]>([]);
    const [matchesRestarting, setMatchesRestarting] = useState<number[]>([]);

    const api = useApiResponse();
    const del = useConfirmDelete<number>();
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
                if (!games || games.length === 0) return <span className={s.muted}>—</span>;
                const gameIds = games.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={s.countLink}
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
                if (!players || players.length === 0) return <span className={s.muted}>—</span>;

                const safeGames = games || [];
                const playerScores = calculatePlayerScores(safeGames, players);
                const allSame = allPlayersHaveSameScore(playerScores);
                const playerIds = players.map(pluck('ID')).join(', ');

                return (
                    <div className={s.playerList}>
                        {playerScores.map((score) => {
                            const isLeader = !allSame && playerScores[0]?.name === score.name;
                            const colorClass = allSame ? s.playerDraw
                                : isLeader ? s.playerWinning
                                : s.playerLosing;
                            const label = allSame ? 'draw'
                                : isLeader ? 'W'
                                : 'L';

                            return (
                                <span
                                    key={`ps-${score.id}`}
                                    className={`${s.playerEntry} ${colorClass}`}
                                    onClick={() => navigate(`/players/search?ids=${encodeURI(playerIds)}`)}
                                    title={`Score: ${score.wins + score.draws * 0.5}`}
                                >
                                    {score.name}
                                    <EloBadge elo={score.elo} eloHistory={score.elo_history} />
                                    <span className={s.scoreValue}>({score.wins}-{score.losses}-{score.draws})</span>
                                    <span className={s.resultTag}>{label}</span>
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
                const statusClass = status === "Complete" ? s.statusComplete
                    : status === "In Progress" ? s.statusInProgress
                    : status === "Stopped" ? s.statusStopped
                    : status === "Error" ? s.statusError
                    : s.statusPending;
                return (
                    <span
                        className={`${s.status} ${statusClass}`}
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
                return <TimeAgo datetime={CreatedAt} className={s.timeAgo} />;
            }
        },
        {
            key: "actions",
            title: "",
            width: 160,
            render: (_, { ID, status, start_time }) => {
                start_time = !start_time || start_time.toString() === "0001-01-01T00:00:00Z" ? new Date() : start_time;
                const isStopping = matchesStopping.includes(ID);
                const isRestarting = matchesRestarting.includes(ID);

                return (
                    <div className={s.actions}>
                        {status === "Pending" && !matchesPlaying.includes(ID) && (
                            <button className={`${s.actionBtn} ${s.actionStart}`} onClick={() => startMatch(ID)} title="Start match">
                                <FaCirclePlay />
                            </button>
                        )}
                        {(status === "In Progress" || matchesPlaying.includes(ID)) && !isStopping && (
                            <button className={`${s.actionBtn} ${s.actionStop}`} onClick={() => stopMatch(ID)} title="Stop match">
                                <FaCircleStop />
                            </button>
                        )}
                        {isStopping && (
                            <span className={s.spinning} title="Stopping...">
                                <FaSpinner className="icon-spin" />
                            </span>
                        )}
                        {(status === "Complete" || status === "Error" || status === "Stopped") && !isRestarting && (
                            <button className={`${s.actionBtn} ${s.actionRestart}`} onClick={() => restartMatch(ID)} title="Restart match">
                                <FaArrowRotateRight />
                            </button>
                        )}
                        {isRestarting && (
                            <span className={s.spinning} title="Restarting...">
                                <FaSpinner className="icon-spin" />
                            </span>
                        )}
                        <button className={`${s.actionBtn} ${s.actionDelete}`} onClick={() => del.confirmDelete(ID)} title="Delete match">
                            <FaTrash />
                        </button>
                    </div>
                );
            }
        },
    ];

    const startMatch = (matchID: number) => {
        setMatchesPlaying(prev => [...prev, matchID]);
        setMatchStartTimes(prev => [...prev, { id: matchID, startTime: new Date() }]);
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/matches/start?match_id=${matchID}`, { method: 'POST' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { refreshData(); setMatchesPlaying(prev => prev.filter(id => id !== matchID)); });
    }

    const stopMatch = (matchID: number) => {
        setMatchesStopping(prev => [...prev, matchID]);
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/matches/stop?match_id=${matchID}`, { method: 'POST' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => {
                refreshData();
                setMatchesStopping(prev => prev.filter(id => id !== matchID));
                setMatchesPlaying(prev => prev.filter(id => id !== matchID));
            })
            .catch(() => { setMatchesStopping(prev => prev.filter(id => id !== matchID)); });
    }

    const restartMatch = (matchID: number) => {
        setMatchesRestarting(prev => [...prev, matchID]);
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/matches/restart?match_id=${matchID}`, { method: 'POST' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { refreshData(); setMatchesRestarting(prev => prev.filter(id => id !== matchID)); })
            .catch(() => { setMatchesRestarting(prev => prev.filter(id => id !== matchID)); });
    }

    const deleteMatch = () => {
        if (!del.itemToDelete) return;
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/matches?match_id=${del.itemToDelete}`, { method: 'DELETE' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { del.resetDelete(); refreshData(); })
            .catch(() => { del.resetDelete(); });
    }

    return (
        <>
            <ApiToast
                show={api.showResponse}
                onClose={() => api.setShowResponse(false)}
                variant={api.alertVariant}
                text={api.alertText}
            />

            <DynamicTable data={tableData} columns={columns} />

            <Modal
                show={del.showModal}
                title={`Delete Match ${del.itemToDelete}?`}
                onHide={del.cancelDelete}
                primaryButton={{ variant: "danger", text: "Delete", onClick: deleteMatch }}
                secondaryButton={{ variant: "secondary", text: "Cancel", onClick: del.cancelDelete }}
            >
                <p>Are you sure you want to delete match #{del.itemToDelete}?</p>
            </Modal>
        </>
    );
}
