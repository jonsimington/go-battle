import { useState } from 'react';
import { Toast } from 'react-bootstrap';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { delay, getApiUrl, pluck } from '../../../utils/utils';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { FaCirclePlay, FaSpinner, FaDiagramProject, FaTrash } from 'react-icons/fa6';
import TimeAgo from 'timeago-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Common/Modal';
import styles from './SearchTournaments.module.css';

interface SearchTournamentsProps {
    tableData: any[]
    refreshData: Function
}

interface TournamentStartTime {
    id: number;
    startTime: Date;
}

const toastStyles = {
    maxWidth: "95%",
    minWidth: "75%"
}

export function SearchTournaments({ tableData, refreshData }: SearchTournamentsProps): JSX.Element {
    const [tournamentsPlaying, setTournamentsPlaying] = useState<number[]>([]);
    const [tournamentStartTimes, setTournamentStartTimes] = useState<TournamentStartTime[]>([]);
    const [tournamentToDelete, setTournamentToDelete] = useState<number | null>(null);

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

    const navigate = useNavigate();

    const columns: IColumnType<TournamentsResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "name",
            title: "Name",
            width: 200,
        },
        {
            key: "players",
            title: "Players",
            width: 100,
            render: (_, { players }) => {
                if (!players || players.length === 0) return <span className={styles.muted}>—</span>;
                const playerIds = players.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={styles.countLink}
                        onClick={() => navigate(`/players/search?ids=${encodeURI(playerIds)}`)}>
                        {players.length} player{players.length !== 1 ? 's' : ''}
                    </span>
                );
            }
        },
        {
            key: "games",
            title: "Games",
            width: 80,
            render: (_, { games, matches }) => {
                // games may be empty on the tournament directly; derive from matches instead
                const allGames = games?.length ? games : (matches ?? []).flatMap((m: any) => m.games ?? []);
                if (!allGames.length) return <span className={styles.muted}>—</span>;
                const gameIds = allGames.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={styles.countLink}
                        onClick={() => navigate(`/games/search?ids=${encodeURI(gameIds)}`)}>
                        {allGames.length} game{allGames.length !== 1 ? 's' : ''}
                    </span>
                );
            }
        },
        {
            key: "matches",
            title: "Matches",
            width: 80,
            render: (_, { matches }) => {
                if (!matches || matches.length === 0) return <span className={styles.muted}>—</span>;
                const matchIds = matches.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={styles.countLink}
                        onClick={() => navigate(`/matches/search?ids=${encodeURI(matchIds)}`)}>
                        {matches.length} match{matches.length !== 1 ? 'es' : ''}
                    </span>
                );
            }
        },
        {
            key: "winner",
            title: "Winner",
            width: 120,
            render: (_, { winner }) => {
                if (!winner || winner.ID === 0) return <span className={styles.muted}>—</span>;
                return (
                    <span
                        className={styles.winnerLink}
                        onClick={() => navigate(`/players/search?ids=${encodeURI(winner.ID.toString())}`)}>
                        {winner.name}
                    </span>
                );
            }
        },
        {
            key: "status",
            title: "Status",
            width: 100,
            render: (_, { status }) => {
                const statusClass = status === "Completed" ? styles.statusCompleted
                    : status === "In Progress" ? styles.statusInProgress
                    : styles.statusPending;
                return <span className={`${styles.status} ${statusClass}`}>{status || "Unknown"}</span>;
            }
        },
        {
            key: "type",
            title: "Type",
            width: 100,
        },
        {
            key: "actions",
            title: "",
            width: 140,
            render: (_, { ID, status }) => (
                <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => navigate(`/tournaments/bracket/${ID}`)} title="View bracket">
                        <FaDiagramProject />
                    </button>
                    {status === "Pending" && !tournamentsPlaying.includes(ID) && (
                        <button className={`${styles.actionBtn} ${styles.actionStart}`} onClick={() => startTournament(ID)} title="Start tournament">
                            <FaCirclePlay />
                        </button>
                    )}
                    {(status === "In Progress" || tournamentsPlaying.includes(ID)) && (
                        <span className={styles.spinning} title="In progress">
                            <FaSpinner className="icon-spin" />
                        </span>
                    )}
                    <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => confirmDeleteTournament(ID)} title="Delete tournament">
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
            return Promise.reject()
        }
    }

    const startTournament = (tournamentID: number) =>  {
        setTournamentsPlaying(prev => [...prev, tournamentID]);
        setTournamentStartTimes(prev => [...prev, {
            id: tournamentID,
            startTime: new Date(),
        }]);

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/tournaments/start?tournament_id=${tournamentID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
            })
            .then(() => {
                refreshData();
                setTournamentsPlaying(prev => prev.filter((mID) => mID !== tournamentID));
            });
    }

    const confirmDeleteTournament = (tournamentID: number) => {
        setTournamentToDelete(tournamentID);
        setShowConfirmDeleteModal(true);
    }

    const deleteTournament = () => {
        if (!tournamentToDelete) return;
        
        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/tournaments?tournament_id=${tournamentToDelete}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
                setShowConfirmDeleteModal(false);
                setTournamentToDelete(null);
                refreshData();
            })
            .catch(() => {
                setShowConfirmDeleteModal(false);
                setTournamentToDelete(null);
            });
    }

    return (
        <>
            <h3>Tournaments</h3>

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

            {/* Using the GenericModal component for delete confirmation */}
            <Modal
                show={showConfirmDeleteModal}
                title={`Delete Tournament ${tournamentToDelete}?`}
                onHide={() => setShowConfirmDeleteModal(false)}
                primaryButton={{
                    variant: "danger",
                    text: "Delete",
                    onClick: deleteTournament
                }}
                secondaryButton={{
                    variant: "secondary",
                    text: "Cancel",
                    onClick: () => setShowConfirmDeleteModal(false)
                }}
            >
                <p>Are you sure you want to delete tournament #{tournamentToDelete}?</p>
            </Modal>
        </>
    );
}
