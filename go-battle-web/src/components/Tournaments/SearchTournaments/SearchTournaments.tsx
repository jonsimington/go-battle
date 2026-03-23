import { useState } from 'react';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { delay, getApiUrl, pluck } from '../../../utils/utils';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { FaCirclePlay, FaSpinner, FaDiagramProject, FaTrash } from 'react-icons/fa6';
import TimeAgo from 'timeago-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Common/Modal';
import { ApiToast } from '../../Common/ApiToast';
import { useApiResponse } from '../../../hooks/useApiResponse';
import { useConfirmDelete } from '../../../hooks/useConfirmDelete';
import s from '../../shared/SearchTable.module.css';

interface SearchTournamentsProps {
    tableData: any[]
    refreshData: Function
}

interface TournamentStartTime {
    id: number;
    startTime: Date;
}

export function SearchTournaments({ tableData, refreshData }: SearchTournamentsProps): JSX.Element {
    const [tournamentsPlaying, setTournamentsPlaying] = useState<number[]>([]);
    const [tournamentStartTimes, setTournamentStartTimes] = useState<TournamentStartTime[]>([]);

    const api = useApiResponse();
    const del = useConfirmDelete<number>();
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
                if (!players || players.length === 0) return <span className={s.muted}>—</span>;
                const playerIds = players.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={s.countLink}
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
                const allGames = games?.length ? games : (matches ?? []).flatMap((m: any) => m.games ?? []);
                if (!allGames.length) return <span className={s.muted}>—</span>;
                const gameIds = allGames.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={s.countLink}
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
                if (!matches || matches.length === 0) return <span className={s.muted}>—</span>;
                const matchIds = matches.map(pluck('ID')).join(', ');
                return (
                    <span
                        className={s.countLink}
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
                if (!winner || winner.ID === 0) return <span className={s.muted}>—</span>;
                return (
                    <span
                        className={s.winnerLink}
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
                const statusClass = status === "Completed" ? s.statusCompleted
                    : status === "In Progress" ? s.statusInProgress
                    : s.statusPending;
                return <span className={`${s.status} ${statusClass}`}>{status || "Unknown"}</span>;
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
                <div className={s.actions}>
                    <button className={s.actionBtn} onClick={() => navigate(`/tournaments/bracket/${ID}`)} title="View bracket">
                        <FaDiagramProject />
                    </button>
                    {status === "Pending" && !tournamentsPlaying.includes(ID) && (
                        <button className={`${s.actionBtn} ${s.actionStart}`} onClick={() => startTournament(ID)} title="Start tournament">
                            <FaCirclePlay />
                        </button>
                    )}
                    {(status === "In Progress" || tournamentsPlaying.includes(ID)) && (
                        <span className={s.spinning} title="In progress">
                            <FaSpinner className="icon-spin" />
                        </span>
                    )}
                    <button className={`${s.actionBtn} ${s.actionDelete}`} onClick={() => del.confirmDelete(ID)} title="Delete tournament">
                        <FaTrash />
                    </button>
                </div>
            )
        },
    ];

    const startTournament = (tournamentID: number) => {
        setTournamentsPlaying(prev => [...prev, tournamentID]);
        setTournamentStartTimes(prev => [...prev, { id: tournamentID, startTime: new Date() }]);
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/tournaments/start?tournament_id=${tournamentID}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(response => api.handleResponse(response))
            .then(() => delay(1000))
            .then(() => { refreshData(); setTournamentsPlaying(prev => prev.filter(id => id !== tournamentID)); });
    }

    const deleteTournament = () => {
        if (!del.itemToDelete) return;
        const apiUrl = getApiUrl();

        fetch(`${apiUrl}/tournaments?tournament_id=${del.itemToDelete}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
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
                title={`Delete Tournament ${del.itemToDelete}?`}
                onHide={del.cancelDelete}
                primaryButton={{ variant: "danger", text: "Delete", onClick: deleteTournament }}
                secondaryButton={{ variant: "secondary", text: "Cancel", onClick: del.cancelDelete }}
            >
                <p>Are you sure you want to delete tournament #{del.itemToDelete}?</p>
            </Modal>
        </>
    );
}
