import { useState } from 'react';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';
import { delay, elapsedTime, getApiUrl, getVisUrl, pluck, prettyTimeAgo } from '../../../utils/utils';
import { apiFetch } from '../../../utils/apiFetch';
import { FaTv, FaTrash, FaCircleStop, FaArrowRotateRight, FaSpinner } from 'react-icons/fa6';
import TimeAgo from 'timeago-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Common/Modal';
import { ApiToast } from '../../Common/ApiToast';
import EloBadge from '../../Common/ELO/ELOBadge';
import { useApiResponse } from '../../../hooks/useApiResponse';
import { useConfirmDelete } from '../../../hooks/useConfirmDelete';
import s from '../../shared/SearchTable.module.css';

interface SearchGamesProps {
    tableData: any[]
    refreshData: Function
}

export function SearchGames({ tableData, refreshData }: SearchGamesProps): JSX.Element {
    const [gamesStopping, setGamesStopping] = useState<number[]>([]);
    const [gamesRestarting, setGamesRestarting] = useState<number[]>([]);
    const api = useApiResponse();
    const del = useConfirmDelete<number>();

    const visUrl = getVisUrl();
    const navigate = useNavigate();

    const columns: IColumnType<GamesResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "players",
            title: "Players",
            width: 200,
            render: (_, { players, winner, loser, draw, result_reason, status }) => {
                if (!players || players.length === 0) return <span className={s.muted}>—</span>;
                const playerIds = players.map(pluck('ID')).join(', ');
                const isComplete = status === 'Complete';

                return (
                    <div className={s.playerList}>
                        {players.map((p: any) => {
                            const isWinner = isComplete && !draw && winner && winner.ID === p.ID;
                            const isLoser = isComplete && !draw && loser && loser.ID === p.ID;
                            const colorClass = isComplete && draw ? s.playerDraw
                                : isWinner ? s.playerWinner
                                : isLoser ? s.playerLoser
                                : '';
                            const label = isComplete && draw ? 'draw'
                                : isWinner ? 'W'
                                : isLoser ? 'L'
                                : null;

                            return (
                                <span
                                    key={p.ID}
                                    className={`${s.playerEntry} ${colorClass}`}
                                    onClick={() => navigate(`/players/search?ids=${encodeURI(playerIds)}`)}
                                >
                                    {p.name}
                                    <EloBadge elo={p.elo} eloHistory={p.elo_history} />
                                    {label && <span className={s.resultTag}>{label}</span>}
                                </span>
                            );
                        })}
                        {result_reason && (
                            <span className={s.resultReason}>{result_reason}</span>
                        )}
                    </div>
                );
            }
        },
        {
            key: "match",
            title: "Match",
            width: 80,
            render: (_, { match, match_id }) => {
                const id = match_id || match?.ID;
                if (!id) return <span className={s.muted}>—</span>;
                return (
                    <span
                        className={s.countLink}
                        onClick={() => navigate(`/matches/search?ids=${encodeURI(id.toString())}`)}>
                        #{id}
                    </span>
                );
            }
        },
        {
            key: "status",
            title: "Status",
            width: 100,
            render: (_, { status, error_message, draw }) => {
                if (status === "Error" || (error_message && !draw)) {
                    return (
                        <span className={`${s.status} ${s.statusError}`} title={error_message || "An error occurred"}>
                            {status}
                        </span>
                    );
                }
                const statusClass = status === "Complete" ? s.statusComplete
                    : status === "In Progress" ? s.statusInProgress
                    : status === "Canceled" ? s.statusCanceled
                    : s.statusPending;
                return <span className={`${s.status} ${statusClass}`}>{status || "Unknown"}</span>;
            }
        },
        {
            key: "elapsed",
            title: "Elapsed",
            width: 100,
            render: (_, { CreatedAt, UpdatedAt, status }) => {
                const terminal = ["Complete", "Error", "Canceled", "Incomplete"];
                if (!terminal.includes(status)) return <span className={s.muted}>—</span>;
                return <span className={s.elapsed}>{prettyTimeAgo(elapsedTime(CreatedAt, UpdatedAt))}</span>;
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
            width: 120,
            render: (_, { gamelog_url, ID, status }) => {
                const isStopping = gamesStopping.includes(ID);
                const isRestarting = gamesRestarting.includes(ID);

                return (
                    <div className={s.actions}>
                        {gamelog_url && gamelog_url !== "" ? (
                            <a
                                className={s.actionBtn}
                                href={`${visUrl}/?log=${encodeURI(gamelog_url)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Visualize">
                                <FaTv />
                            </a>
                        ) : (
                            <span className={`${s.actionBtn} ${s.actionDisabled}`} title="No gamelog">
                                <FaTv />
                            </span>
                        )}
                        {status === "In Progress" && !isStopping && (
                            <button
                                className={`${s.actionBtn} ${s.actionStop}`}
                                onClick={() => stopGame(ID)}
                                title="Stop game">
                                <FaCircleStop />
                            </button>
                        )}
                        {isStopping && (
                            <span className={s.spinning} title="Stopping...">
                                <FaSpinner className="icon-spin" />
                            </span>
                        )}
                        {(status === "Complete" || status === "Error" || status === "Canceled") && !isRestarting && (
                            <button
                                className={`${s.actionBtn} ${s.actionRestart}`}
                                onClick={() => restartGame(ID)}
                                title="Restart game">
                                <FaArrowRotateRight />
                            </button>
                        )}
                        {isRestarting && (
                            <span className={s.spinning} title="Restarting...">
                                <FaSpinner className="icon-spin" />
                            </span>
                        )}
                        <button
                            className={`${s.actionBtn} ${s.actionDelete}`}
                            onClick={() => del.confirmDelete(ID)}
                            title="Delete game">
                            <FaTrash />
                        </button>
                    </div>
                );
            }
        },
    ];

    const stopGame = (gameID: number) => {
        setGamesStopping(prev => [...prev, gameID]);
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/games/stop?game_id=${gameID}`, { method: 'POST' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { refreshData(); setGamesStopping(prev => prev.filter(id => id !== gameID)); })
            .catch(() => { setGamesStopping(prev => prev.filter(id => id !== gameID)); });
    }

    const restartGame = (gameID: number) => {
        setGamesRestarting(prev => [...prev, gameID]);
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/games/restart?game_id=${gameID}`, { method: 'POST' })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { refreshData(); setGamesRestarting(prev => prev.filter(id => id !== gameID)); })
            .catch(() => { setGamesRestarting(prev => prev.filter(id => id !== gameID)); });
    }

    const deleteGame = () => {
        if (!del.itemToDelete) return;
        const apiUrl = getApiUrl();

        apiFetch(`${apiUrl}/games?game_id=${del.itemToDelete}`, { method: 'DELETE' })
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
                title={`Delete Game ${del.itemToDelete}?`}
                onHide={del.cancelDelete}
                primaryButton={{ variant: "danger", text: "Delete", onClick: deleteGame }}
                secondaryButton={{ variant: "secondary", text: "Cancel", onClick: del.cancelDelete }}
            >
                <p>Are you sure you want to delete game #{del.itemToDelete}?</p>
            </Modal>
        </>
    );
}
