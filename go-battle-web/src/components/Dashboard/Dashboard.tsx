import { FC, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '../../models/DashboardStats';
import { getApiUrl, prettyTimeAgo } from '../../utils/utils';
import { STATUS_COLORS, ELO_TIER_COLORS, getEloTier } from '../../utils/colors';
import { FaCaretUp, FaCaretDown, FaTrophy } from 'react-icons/fa';
import RefreshButton from '../Common/RefreshButton';
import styles from './Dashboard.module.css';

const apiUrl = getApiUrl();

function formatDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (!start || !end || end <= start) return '—';
    return prettyTimeAgo(end - start);
}

const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/stats/dashboard`, { mode: 'cors' });
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading…</div></div>;
    }

    if (!stats) {
        return <div className={styles.container}><div className={styles.loading}>Failed to load dashboard data.</div></div>;
    }

    const totalGamesInStatus = Object.values(stats.games_by_status).reduce((a, b) => a + b, 0);
    const eloMax = Math.max(...(stats.elo_distribution?.map(b => b.count) || [1]), 1);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Dashboard</h2>
                <RefreshButton onRefresh={fetchStats} />
            </div>

            {/* Summary counts */}
            <div className={styles.statsGrid}>
                <Link to="/players/search" className={styles.statCard}>
                    <span className={styles.statLabel}>Players</span>
                    <span className={styles.statValue}>{stats.player_count}</span>
                </Link>
                <Link to="/matches/search" className={styles.statCard}>
                    <span className={styles.statLabel}>Matches</span>
                    <span className={styles.statValue}>{stats.match_count}</span>
                </Link>
                <Link to="/games/search" className={styles.statCard}>
                    <span className={styles.statLabel}>Games</span>
                    <span className={styles.statValue}>{stats.game_count}</span>
                </Link>
                <Link to="/tournaments/search" className={styles.statCard}>
                    <span className={styles.statLabel}>Tournaments</span>
                    <span className={styles.statValue}>{stats.tournament_count}</span>
                </Link>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Avg Match Duration</span>
                    <span className={styles.statValue}>
                        {stats.avg_match_duration_ms > 0 ? prettyTimeAgo(stats.avg_match_duration_ms) : '—'}
                    </span>
                </div>
            </div>

            <div className={styles.columns}>
                {/* Left column */}
                <div className={styles.columnLeft}>
                    {/* Leaderboard */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>Leaderboard</div>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.thRank}>#</th>
                                    <th>Player</th>
                                    <th className={styles.thRight}>W / L / D</th>
                                    <th className={styles.thRight}>ELO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats.top_players || []).map((p, i) => {
                                    const tier = getEloTier(p.elo);
                                    const winRate = p.total_games > 0
                                        ? ((p.wins / p.total_games) * 100).toFixed(0)
                                        : '—';
                                    return (
                                        <tr key={p.id} className={styles.tableRow}>
                                            <td className={styles.rank}>
                                                {i < 3 ? <FaTrophy style={{ color: ['#d4a017', '#a8a8a8', '#cd7f32'][i], fontSize: 12 }} /> : i + 1}
                                            </td>
                                            <td className={styles.playerCell}>
                                                <Link to={`/players/${p.id}`} className={styles.playerLink}>
                                                    <span className={styles.playerName}>{p.name}</span>
                                                    <span className={styles.winRate}>{winRate}% win</span>
                                                </Link>
                                            </td>
                                            <td className={styles.record}>
                                                <Link to={`/games/search?players=${p.id}`} className={styles.recordLink}>
                                                    <span className={styles.wins}>{p.wins}</span>
                                                    {' / '}
                                                    <span className={styles.losses}>{p.losses}</span>
                                                    {' / '}
                                                    <span className={styles.draws}>{p.draws}</span>
                                                </Link>
                                            </td>
                                            <td className={styles.eloCell}>
                                                <span className={styles.eloBadge} style={{ color: ELO_TIER_COLORS[tier] }}>
                                                    {p.elo}
                                                </span>
                                                {p.elo_trend !== 0 && (
                                                    <span className={p.elo_trend > 0 ? styles.trendUp : styles.trendDown}>
                                                        {p.elo_trend > 0 ? <FaCaretUp /> : <FaCaretDown />}
                                                        {Math.abs(p.elo_trend)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {(!stats.top_players || stats.top_players.length === 0) && (
                            <div className={styles.empty}>No players yet</div>
                        )}
                    </div>

                    {/* ELO Distribution */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>ELO Distribution</div>
                        <div className={styles.eloChart}>
                            {(stats.elo_distribution || []).map(bucket => (
                                <div key={bucket.label} className={styles.eloBarRow}>
                                    <span className={styles.eloBarLabel}>{bucket.label}</span>
                                    <div className={styles.eloBarTrack}>
                                        <div
                                            className={styles.eloBarFill}
                                            style={{ width: `${(bucket.count / eloMax) * 100}%` }}
                                        />
                                    </div>
                                    <span className={styles.eloBarCount}>{bucket.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className={styles.columnRight}>
                    {/* Game status breakdown */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>Game Status</div>
                        <div className={styles.statusList}>
                            {Object.entries(stats.games_by_status).map(([status, count]) => (
                                <Link
                                    key={status}
                                    to={`/games/search?status=${encodeURIComponent(status)}`}
                                    className={styles.statusRow}
                                >
                                    <span className={styles.statusDot} style={{ background: STATUS_COLORS[status] || 'var(--text-muted)' }} />
                                    <span className={styles.statusLabel}>{status}</span>
                                    <span className={styles.statusCount}>{count}</span>
                                    <div className={styles.statusBar}>
                                        <div
                                            className={styles.statusBarFill}
                                            style={{
                                                width: `${totalGamesInStatus > 0 ? (count / totalGamesInStatus) * 100 : 0}%`,
                                                background: STATUS_COLORS[status] || 'var(--text-muted)',
                                            }}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Active tournaments */}
                    {stats.active_tournaments && stats.active_tournaments.length > 0 && (
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>Active Tournaments</div>
                            {stats.active_tournaments.map(t => (
                                <Link key={t.id} to={`/tournaments/bracket/${t.id}`} className={styles.tournamentRow}>
                                    <div className={styles.tournamentInfo}>
                                        <span className={styles.tournamentName}>{t.name}</span>
                                        <span className={styles.tournamentMeta}>
                                            {t.type} · {t.player_count} players · Round {t.current_round}
                                        </span>
                                    </div>
                                    <span
                                        className={styles.statusTag}
                                        style={{ color: STATUS_COLORS[t.status] || 'var(--text-secondary)' }}
                                    >
                                        {t.status}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Recent matches */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>Recent Matches</div>
                        <div className={styles.matchList}>
                            {(stats.recent_matches || []).map(m => (
                                <Link key={m.id} to={`/matches/search?ids=${m.id}`} className={styles.matchRow}>
                                    <div className={styles.matchPlayers}>
                                        <Link to={`/players/${m.player1_id}`} className={styles.matchPlayerLink} onClick={e => e.stopPropagation()}>
                                            {m.player1 || '—'}
                                        </Link>
                                        <span className={styles.vs}>vs</span>
                                        <Link to={`/players/${m.player2_id}`} className={styles.matchPlayerLink} onClick={e => e.stopPropagation()}>
                                            {m.player2 || '—'}
                                        </Link>
                                    </div>
                                    <div className={styles.matchMeta}>
                                        <span
                                            className={styles.matchStatus}
                                            style={{ color: STATUS_COLORS[m.status] || 'var(--text-muted)' }}
                                        >
                                            {m.status}
                                        </span>
                                        <span className={styles.matchGames}>{m.num_games}g</span>
                                        {m.end_time && m.start_time && (
                                            <span className={styles.matchDuration}>
                                                {formatDuration(m.start_time, m.end_time)}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                            {(!stats.recent_matches || stats.recent_matches.length === 0) && (
                                <div className={styles.empty}>No matches yet</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
