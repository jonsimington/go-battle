import { useState } from 'react';
import { Toast } from 'react-bootstrap';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';
import { delay, getApiUrl, getVisUrl, pluck } from '../../../utils/utils';
import { FaTv, FaTrash } from 'react-icons/fa6';
import TimeAgo from 'timeago-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Common/Modal';
import styles from './SearchGames.module.css';

interface SearchGamesProps {
    tableData: any[]
    refreshData: Function
}

const toastStyles = {
    maxWidth: "95%",
    minWidth: "75%"
}

export function SearchGames({ tableData, refreshData }: SearchGamesProps): JSX.Element {
    const [gameToDelete, setGameToDelete] = useState<number | null>(null);
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

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
            render: (_, { players, winner, loser, draw }) => {
                if (!players || players.length === 0) return <span className={styles.muted}>—</span>;
                const playerIds = players.map(pluck('ID')).join(', ');

                return (
                    <div className={styles.playerList}>
                        {players.map((p: any) => {
                            const isWinner = !draw && winner && winner.ID === p.ID;
                            const isLoser = !draw && loser && loser.ID === p.ID;
                            const colorClass = draw ? styles.playerDraw
                                : isWinner ? styles.playerWinner
                                : isLoser ? styles.playerLoser
                                : '';
                            const label = draw ? 'draw'
                                : isWinner ? 'W'
                                : isLoser ? 'L'
                                : null;

                            return (
                                <span
                                    key={p.ID}
                                    className={`${styles.playerName} ${colorClass}`}
                                    onClick={() => navigate(`/players/search?ids=${encodeURI(playerIds)}`)}
                                >
                                    {p.name}
                                    {label && <span className={styles.resultTag}>{label}</span>}
                                </span>
                            );
                        })}
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
                if (!id) return <span className={styles.muted}>—</span>;
                return (
                    <span
                        className={styles.countLink}
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
            render: (_, { status, error_message }) => {
                if (status === "Error" || error_message) {
                    return (
                        <span className={`${styles.status} ${styles.statusError}`} title={error_message || "An error occurred"}>
                            {status}
                        </span>
                    );
                }
                const statusClass = status === "Complete" ? styles.statusComplete
                    : status === "In Progress" ? styles.statusInProgress
                    : styles.statusPending;
                return <span className={`${styles.status} ${statusClass}`}>{status || "Unknown"}</span>;
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
            width: 100,
            render: (_, { gamelog_url, ID }) => (
                <div className={styles.actions}>
                    {gamelog_url && gamelog_url !== "" ? (
                        <a
                            className={styles.actionBtn}
                            href={`${visUrl}/?log=${encodeURI(gamelog_url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visualize">
                            <FaTv />
                        </a>
                    ) : (
                        <span className={`${styles.actionBtn} ${styles.actionDisabled}`} title="No gamelog">
                            <FaTv />
                        </span>
                    )}
                    <button
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        onClick={() => confirmDeleteGame(ID)}
                        title="Delete game">
                        <FaTrash />
                    </button>
                </div>
            )
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

    const confirmDeleteGame = (gameID: number) => {
        setGameToDelete(gameID);
        setShowConfirmDeleteModal(true);
    }

    const deleteGame = () => {
        if (!gameToDelete) return;

        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/games?game_id=${gameToDelete}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
                setShowConfirmDeleteModal(false);
                setGameToDelete(null);
                refreshData();
            })
            .catch(() => {
                setShowConfirmDeleteModal(false);
                setGameToDelete(null);
            });
    }

    return (
        <>
            <h3>Games</h3>

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
                title={`Delete Game ${gameToDelete}?`}
                onHide={() => setShowConfirmDeleteModal(false)}
                primaryButton={{
                    variant: "danger",
                    text: "Delete",
                    onClick: deleteGame
                }}
                secondaryButton={{
                    variant: "secondary",
                    text: "Cancel",
                    onClick: () => setShowConfirmDeleteModal(false)
                }}
            >
                <p>Are you sure you want to delete game #{gameToDelete}?</p>
            </Modal>
        </>
    );
}
