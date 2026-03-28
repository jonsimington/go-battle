import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useMemo } from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { calculateStreak, pluck } from '../../../utils/utils';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { FaMedal, FaTrophy, FaFire } from 'react-icons/fa6';
import EloBadge from '../../Common/ELO/ELOBadge';
import { Link, useNavigate } from 'react-router-dom';
import './SearchPlayers.css';

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
    filterValues?: Record<string, string>,
    sortField?: string,
    sortDir?: 'asc' | 'desc',
}

// Pure function hoisted outside component — no re-creation each render
const calculateWinPercentage = (player: PlayersResult): number => {
    const games = player.games || [];
    let wins = 0;
    let draws = 0;
    let total = 0;
    for (const g of games) {
        if (g.status !== "Complete") continue;
        total++;
        if ((g.winner_id || g.winner?.ID) === player.ID) wins++;
        if (g.draw) draws++;
    }
    return total > 0 ? ((2 * wins + draws) / (2 * total) * 100) : 0;
};

// Count wins/losses/draws in a single pass instead of 3 separate filter calls
const countGameResults = (games: any[], playerID: number) => {
    let wins = 0, losses = 0, draws = 0, total = 0;
    for (const g of games) {
        if (g.status !== "Complete") continue;
        total++;
        if (g.draw) { draws++; continue; }
        if ((g.winner_id || g.winner?.ID) === playerID) wins++;
        else if ((g.loser_id || g.loser?.ID) === playerID) losses++;
    }
    return { wins, losses, draws, total };
};

export function SearchPlayers({ tableData, refreshData, filterValues = {}, sortField = 'elo', sortDir = 'desc' }: SearchPlayersProps): JSX.Element {
    const navigate = useNavigate();

    // Derive sorted + filtered data during render via useMemo instead of useEffect chains
    const filteredData = useMemo(() => {
        let result = [...tableData] as PlayersResult[];

        // Sort
        if (sortField === 'elo') {
            result.sort((a, b) => sortDir === 'desc' ? b.elo - a.elo : a.elo - b.elo);
        } else if (sortField === 'win_percent') {
            result.sort((a, b) => sortDir === 'desc'
                ? calculateWinPercentage(b) - calculateWinPercentage(a)
                : calculateWinPercentage(a) - calculateWinPercentage(b));
        } else if (sortField === 'name') {
            result.sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        } else if (sortField === 'activity') {
            result.sort((a, b) => sortDir === 'desc'
                ? (b.games || []).length - (a.games || []).length
                : (a.games || []).length - (b.games || []).length);
        } else {
            // created_at
            result.sort((a, b) => sortDir === 'desc'
                ? (a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
                : (a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0));
        }

        // Filter by name (client-side text search from filterValues)
        const nameFilter = filterValues['name']?.toLowerCase();
        if (nameFilter) {
            result = result.filter(player => player.name.toLowerCase().includes(nameFilter));
        }

        return result;
    }, [tableData, sortField, sortDir, filterValues]);

    const renderRankBadge = (index: number) => {
        if (index === 0) return <FaTrophy className="text-warning" title="Top Ranked Player" />;
        if (index === 1) return <FaMedal className="text-light" title="2nd Place" />;
        if (index === 2) return <FaMedal className="text-orange" title="3rd Place" style={{color: '#f78166'}} />;
        return null;
    };

    const renderPlayerActivity = (games: any[]) => {
        if (!games) return null;
        const recentGames = [...games.filter(g => g.status === "Complete")]
                               .sort((a: any, b: any) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0)
                               .slice(0, 15);
        
        if (recentGames.length === 0) return null;
        
        const lastPlayed = new Date(recentGames[0].UpdatedAt);
        const now = new Date();
        const daysSinceLastGame = Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 3600 * 24));
        
        if (daysSinceLastGame < 3) {
            return <Badge bg="success" className="ms-2">Active</Badge>;
        } else if (daysSinceLastGame < 14) {
            return <Badge bg="info" className="ms-2">Recent</Badge>;
        } else {
            return <Badge bg="secondary" className="ms-2">Inactive</Badge>;
        }
    };

    const columns: IColumnType<PlayersResult>[] = [
        {
            key: "rank",
            title: "#",
            width: 50,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult, index?: number) => {
                const displayIndex = typeof index === 'number' ? index : 0;
                return (
                    <div className="d-flex align-items-center">
                        <span className="me-2">{displayIndex + 1}</span>
                        {renderRankBadge(displayIndex)}
                    </div>
                );
            }
        },
        {
            key: "name",
            title: "Name",
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { name, ID, games } = item;
                return (
                    <div className="player-name-cell">
                        <div className="player-card">
                            <span className="player-name">{name}</span>
                            {renderPlayerActivity(games)}
                            <span className="player-links">
                                <Link to={`/games/search?players=${ID}`} className="player-link">Games</Link>
                                <Link to={`/matches/search?players=${ID}`} className="player-link">Matches</Link>
                            </span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "wins",
            title: "W / L / D",
            width: 160,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { ID } = item;
                const { wins, losses, draws, total } = countGameResults(item.games || [], ID);
                const wPct = total > 0 ? (wins / total) * 100 : 0;
                const lPct = total > 0 ? (losses / total) * 100 : 0;
                const dPct = total > 0 ? (draws / total) * 100 : 0;

                return (
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id={`tooltip-${ID}-stats`}>
                                {total} games: {wins}W / {losses}L / {draws}D
                            </Tooltip>
                        }
                    >
                        <div className="wld-cell">
                            <div className="wld-numbers">
                                <span className="wld-w">{wins}</span>
                                <span className="wld-sep">/</span>
                                <span className="wld-l">{losses}</span>
                                <span className="wld-sep">/</span>
                                <span className="wld-d">{draws}</span>
                            </div>
                            <div className="wld-bar">
                                <div className="wld-bar-w" style={{ width: `${wPct}%` }} />
                                <div className="wld-bar-l" style={{ width: `${lPct}%` }} />
                                <div className="wld-bar-d" style={{ width: `${dPct}%` }} />
                            </div>
                        </div>
                    </OverlayTrigger>
                );
            }
        },
        {
            key: "streak",
            title: "Streak",
            width: 80,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { ID } = item;
                const safeGames = item.games || [];
                const sortedGames = [...safeGames.filter(g => g.status === "Complete")]
                    .sort((a: any, b: any) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0);
                const { streakType, streakCount } = calculateStreak(sortedGames, ID);
                
                if (streakCount === 0) {
                    return <span className="streak-none">—</span>;
                }

                const label = streakType === "win" ? "W" : streakType === "lose" ? "L" : "D";
                const cls = streakType === "win" ? "streak-win" : streakType === "lose" ? "streak-lose" : "streak-draw";
                
                return (
                    <span className={`streak-badge ${cls}`}>
                        {streakCount}{label}
                        {streakType === "win" && streakCount >= 3 ? <FaFire className="streak-fire" /> : null}
                    </span>
                );
            }
        },
        {
            key: "win_percent",
            title: "Win %",
            width: 80,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { wins, draws, total } = countGameResults(item.games || [], item.ID);
                if (total === 0) return <span className="streak-none">—</span>;
                const winPercent = Math.round(((2 * wins + draws) / (2 * total)) * 1000) / 10;

                const cls = winPercent >= 60 ? 'wp-high' : winPercent >= 45 ? 'wp-mid' : 'wp-low';
                return <span className={`win-pct ${cls}`}>{winPercent.toFixed(1)}%</span>;
            }
        },
        {
            key: "elo",
            title: "ELO",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { elo, elo_history } = item;
                return (
                    <EloBadge elo={elo} eloHistory={elo_history} />
                );
            }
        },
        {
            key: "elo_history",
            title: "ELO History",
            width: 200,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const elo_history = item.elo_history || [];
                if (elo_history.length === 0) {
                    return "No History Yet";
                }
                else if (elo_history.length < 3) {
                    return "Not Enough History";
                }
                else {
                    // Use spread + sort to avoid mutating the original array during render
                    const sortedHistory = [...elo_history].sort((a: any, b: any) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0);
                    const sortedElos = sortedHistory.map(pluck('elo'));

                    const firstElo = sortedElos[0];
                    const lastElo = sortedElos[sortedElos.length - 1];
                    const sparklineColor = firstElo < lastElo ? "#3fb950" : "#f85149";

                    return (
                        <div className="d-flex align-items-center">
                            <Sparklines data={sortedElos} width={100} height={25} margin={5}>
                                <SparklinesLine color={sparklineColor} style={{ strokeWidth: 0.5 }} />
                                <SparklinesSpots size={1} style={{ fill: sparklineColor }} />
                            </Sparklines>
                            <Badge 
                                bg={firstElo < lastElo ? "success" : "danger"} 
                                className="ms-2">
                                {firstElo < lastElo ? "+" : ""}{lastElo - firstElo}
                            </Badge>
                        </div>
                    );
                }
            }
        },
        {
            key: "client",
            title: "Client",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { client } = item;
                if (!client) return <span className="streak-none">—</span>;
                return (
                    <Link
                        to={`/clients/search?ids=${client.ID}`}
                        className="player-link"
                    >
                        {client.ID}
                    </Link>
                );
            }
        }
    ];

    return (
        <DynamicTable
            data={filteredData}
            columns={columns}
            onRowClick={(player: PlayersResult) => navigate(`/players/${player.ID}`)}
        />
    );
}
