import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PlayersResult } from '../../../models/PlayersResult';
import { GamesResult } from '../../../models/GamesResult';
import { HistoricalElo } from '../../../models/HistoricalElo';
import { getApiUrl, prettyDate, calculateStreak, calculateGameResult } from '../../../utils/utils';
import { ELO_TIER_COLORS, getEloTier } from '../../../utils/colors';
import { FaArrowLeft, FaFire } from 'react-icons/fa6';
import EloBadge from '../../Common/ELO/ELOBadge';
import RefreshButton from '../../Common/RefreshButton';
import s from './PlayerDetail.module.css';

const apiUrl = getApiUrl();
const INITIAL_GAMES_SHOWN = 20;

const PlayerDetail: FC = () => {
    const { id } = useParams<{ id: string }>();
    const [player, setPlayer] = useState<PlayersResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [gamesShown, setGamesShown] = useState(INITIAL_GAMES_SHOWN);

    const fetchPlayer = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/players/${id}`, { mode: 'cors' });
            if (!res.ok) { setPlayer(null); return; }
            const data = await res.json();
            setPlayer(data);
        } catch {
            setPlayer(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchPlayer(); }, [fetchPlayer]);

    const completedGames = useMemo(() => {
        if (!player?.games) return [];
        return [...player.games]
            .filter(g => g.status === 'Complete')
            .sort((a, b) => (a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0));
    }, [player]);

    const stats = useMemo(() => {
        if (!player) return { wins: 0, losses: 0, draws: 0, total: 0, winPct: 0, streak: { streakType: 'none', streakCount: 0 } };
        let wins = 0, losses = 0, draws = 0, total = 0;
        for (const g of completedGames) {
            total++;
            if (g.draw) { draws++; continue; }
            if ((g.winner_id || g.winner?.ID) === player.ID) wins++;
            else if ((g.loser_id || g.loser?.ID) === player.ID) losses++;
        }
        const winPct = total > 0 ? Math.round(((2 * wins + draws) / (2 * total)) * 1000) / 10 : 0;
        const streak = calculateStreak(completedGames, player.ID);
        return { wins, losses, draws, total, winPct, streak };
    }, [player, completedGames]);

    const eloHistory = useMemo(() => {
        if (!player?.elo_history || player.elo_history.length === 0) return [];
        return [...player.elo_history].sort((a, b) =>
            new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
        );
    }, [player]);

    // Map each completed game ID → ELO delta by aligning ascending-sorted games
    // with ascending-sorted ELO history (1 entry created per completed game).
    const eloDeltas = useMemo(() => {
        const map = new Map<number, number>();
        if (!eloHistory.length || !completedGames.length) return map;
        // completedGames is descending; reverse to get oldest-first order
        const ascGames = [...completedGames].reverse();
        ascGames.forEach((game, i) => {
            const after = eloHistory[i]?.elo;
            if (after === undefined) return;
            const before = i === 0 ? 1500 : eloHistory[i - 1].elo;
            map.set(game.ID, after - before);
        });
        return map;
    }, [completedGames, eloHistory]);

    if (loading) {
        return <div className={s.container}><div className={s.loading}>Loading…</div></div>;
    }

    if (!player) {
        return (
            <div className={s.container}>
                <Link to="/players/search" className={s.backLink}><FaArrowLeft /> Players</Link>
                <div className={s.notFound}>Player not found.</div>
            </div>
        );
    }

    const tier = getEloTier(player.elo);
    const tierColor = ELO_TIER_COLORS[tier];

    return (
        <div className={s.container}>
            <Link to="/players/search" className={s.backLink}><FaArrowLeft /> Players</Link>

            <div className={s.header}>
                <h2 className={s.playerName}>{player.name}</h2>
                <EloBadge elo={player.elo} eloHistory={player.elo_history} />
                <RefreshButton onRefresh={fetchPlayer} />
            </div>

            {player.client && (
                <div className={s.clientCard}>
                    <Link to={`/clients/search?ids=${player.client.ID}`} className={s.clientRepoLink}>
                        {player.client.repo || `Client #${player.client.ID}`}
                    </Link>
                    <span className={s.clientSep} />
                    <span className={s.clientTag}>{player.client.language}</span>
                    <span className={s.clientTag}>{player.client.game}</span>
                </div>
            )}

            {/* Stat cards */}
            <div className={s.statsRow}>
                <div className={s.stat}>
                    <span className={s.statLabel}>ELO</span>
                    <span className={s.statValue} style={{ color: tierColor }}>{player.elo}</span>
                    <span className={s.statSubtext}>{tier}</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Wins</span>
                    <span className={s.statValue} style={{ color: 'var(--success)' }}>{stats.wins}</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Losses</span>
                    <span className={s.statValue} style={{ color: 'var(--danger)' }}>{stats.losses}</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Draws</span>
                    <span className={s.statValue}>{stats.draws}</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Win %</span>
                    <span className={s.statValue}>{stats.winPct.toFixed(1)}%</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Games</span>
                    <span className={s.statValue}>{stats.total}</span>
                </div>
                <div className={s.stat}>
                    <span className={s.statLabel}>Streak</span>
                    <span className={s.statValue}>
                        {stats.streak.streakCount > 0 ? (
                            <>
                                <span style={{
                                    color: stats.streak.streakType === 'win' ? 'var(--success)'
                                        : stats.streak.streakType === 'lose' ? 'var(--danger)'
                                        : 'var(--warning)'
                                }}>
                                    {stats.streak.streakCount}{stats.streak.streakType === 'win' ? 'W' : stats.streak.streakType === 'lose' ? 'L' : 'D'}
                                </span>
                                {stats.streak.streakType === 'win' && stats.streak.streakCount >= 3 && (
                                    <FaFire style={{ color: 'var(--warning)', marginLeft: 4, fontSize: 14 }} />
                                )}
                            </>
                        ) : '—'}
                    </span>
                </div>
            </div>

            <div className={s.columns}>
                {/* ELO History Chart */}
                <div className={s.panel}>
                    <div className={s.panelHeader}>ELO History</div>
                    {eloHistory.length < 3 ? (
                        <div className={s.chartEmpty}>Not enough history to chart.</div>
                    ) : (
                        <EloChart data={eloHistory} tier={tier} />
                    )}
                </div>

                {/* Win/Loss Breakdown */}
                <div className={s.panel}>
                    <div className={s.panelHeader}>Win / Loss Breakdown</div>
                    {stats.total === 0 ? (
                        <div className={s.empty}>No completed games yet.</div>
                    ) : (
                        <WinLossDonut wins={stats.wins} losses={stats.losses} draws={stats.draws} />
                    )}
                </div>

                {/* Game History */}
                <div className={`${s.panel} ${s.fullWidth}`}>
                    <div className={s.panelHeader}>Recent Games</div>
                    {completedGames.length === 0 ? (
                        <div className={s.empty}>No games played yet.</div>
                    ) : (
                        <>
                            <div className={s.tableScroll}>
                            <table className={s.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Result</th>
                                        <th>Opponent</th>
                                        <th>ELO Δ</th>
                                        <th>Match</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedGames.slice(0, gamesShown).map((game) => (
                                        <GameHistoryRow key={game.ID} game={game} playerId={player.ID} eloDelta={eloDeltas.get(game.ID)} />
                                    ))}
                                </tbody>
                            </table>
                            </div>
                            {completedGames.length > gamesShown && (
                                <div className={s.historyShowMore}>
                                    <button
                                        className={s.historyShowMoreBtn}
                                        onClick={() => setGamesShown(prev => prev + 20)}
                                    >
                                        Show more ({completedGames.length - gamesShown} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── ELO History SVG Chart ── */

interface EloChartProps {
    data: HistoricalElo[];
    tier: string;
}

const EloChart: FC<EloChartProps> = ({ data, tier }) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const width = 520;
    const height = 220;
    const padL = 44;
    const padR = 48;
    const padT = 16;
    const padB = 28;

    const elos = data.map(d => d.elo);
    const minElo = Math.min(...elos);
    const maxElo = Math.max(...elos);
    const eloRange = maxElo - minElo || 1;
    const yMin = minElo - Math.max(Math.round(eloRange * 0.1), 10);
    const yMax = maxElo + Math.max(Math.round(eloRange * 0.1), 10);
    const yRange = yMax - yMin;

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const tierColor = ELO_TIER_COLORS[tier] || 'var(--primary)';
    const firstElo = elos[0];
    const lastElo = elos[elos.length - 1];
    const lineColor = lastElo >= firstElo ? 'var(--success)' : 'var(--danger)';

    const points = data.map((d, i) => {
        const x = padL + (i / (data.length - 1)) * chartW;
        const y = padT + chartH - ((d.elo - yMin) / yRange) * chartH;
        return { x, y, elo: d.elo, date: d.CreatedAt };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = linePath + ` L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;

    // Grid lines — 4 horizontal
    const gridLines = Array.from({ length: 5 }, (_, i) => {
        const val = yMin + (i / 4) * yRange;
        const y = padT + chartH - (i / 4) * chartH;
        return { val: Math.round(val), y };
    });

    return (
        <div className={s.chartContainer}>
            <svg viewBox={`0 0 ${width} ${height}`} className={s.chart} preserveAspectRatio="xMidYMid meet">
                {/* Grid */}
                {gridLines.map((g, i) => (
                    <g key={i}>
                        <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} className={s.chartGridLine} />
                        <text x={padL - 6} y={g.y + 3} textAnchor="end" className={s.chartLabel}>{g.val}</text>
                    </g>
                ))}

                {/* Area fill */}
                <path d={areaPath} fill={lineColor} className={s.chartArea} />

                {/* Line */}
                <path d={linePath} stroke={lineColor} className={s.chartLine} />

                {/* Dots — only show endpoints + every ~10th point for large datasets */}
                {points.map((p, i) => {
                    const show = i === 0 || i === points.length - 1 || (points.length <= 30) || (i % Math.ceil(points.length / 20) === 0);
                    if (!show) return null;
                    return (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={i === 0 || i === points.length - 1 ? 4 : 2.5}
                            fill={lineColor}
                            className={s.chartDot}
                        />
                    );
                })}

                {/* End label */}
                <text
                    x={points[points.length - 1].x + 4}
                    y={points[points.length - 1].y - 6}
                    className={s.chartLabel}
                    style={{ fill: tierColor, fontWeight: 600, fontSize: 11 }}
                >
                    {lastElo}
                </text>

                {/* Hover crosshair + dot */}
                {hovered !== null && (
                    <>
                        <line
                            x1={points[hovered].x}
                            y1={padT}
                            x2={points[hovered].x}
                            y2={padT + chartH}
                            className={s.chartTooltipLine}
                        />
                        <circle
                            cx={points[hovered].x}
                            cy={points[hovered].y}
                            r={5}
                            fill={lineColor}
                            stroke="var(--bg)"
                            strokeWidth={2}
                        />
                    </>
                )}

                {/* Invisible hit areas for all points */}
                {points.map((p, i) => (
                    <circle
                        key={`hit-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={Math.max(8, chartW / points.length / 2)}
                        fill="transparent"
                        style={{ cursor: 'crosshair' }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </svg>

            {/* HTML tooltip */}
            {hovered !== null && (
                <div
                    className={s.chartTooltip}
                    style={{
                        left: `${(points[hovered].x / width) * 100}%`,
                        top: `${(points[hovered].y / height) * 100}%`,
                    }}
                >
                    <span className={s.chartTooltipElo}>{points[hovered].elo}</span>
                    <span className={s.chartTooltipDate}>
                        {new Date(points[hovered].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                </div>
            )}
        </div>
    );
};

/* ── Win/Loss Donut ── */

interface WinLossDonutProps {
    wins: number;
    losses: number;
    draws: number;
}

const WinLossDonut: FC<WinLossDonutProps> = ({ wins, losses, draws }) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const total = wins + losses + draws;
    const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;
    const size = 160;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const segments = [
        { value: wins, color: 'var(--success)', label: 'Wins' },
        { value: losses, color: 'var(--danger)', label: 'Losses' },
        { value: draws, color: 'var(--warning)', label: 'Draws' },
    ];

    let offset = 0;
    const arcs = segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0;
        const dashLength = pct * circumference;
        const dashOffset = -offset;
        offset += dashLength;
        return { ...seg, dashLength, dashOffset, pct, index: i };
    });

    const centerText = hovered !== null
        ? { value: `${Math.round(arcs[hovered].pct * 100)}%`, label: segments[hovered].label.toLowerCase(), color: segments[hovered].color }
        : { value: `${winPct}%`, label: 'win rate', color: 'var(--text-primary)' };

    return (
        <div className={s.donutContainer}>
            <svg width={size + 8} height={size + 8} viewBox={`-4 -4 ${size + 8} ${size + 8}`} className={s.donut}>
                {/* Background ring */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="var(--border-muted, #21262d)" strokeWidth={strokeWidth}
                />
                {arcs.map((arc, i) => arc.dashLength > 0 ? (
                    <circle
                        key={i}
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={hovered === i ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                        strokeDashoffset={arc.dashOffset}
                        strokeLinecap="butt"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        style={{ cursor: 'pointer', transition: 'stroke-width 150ms ease' }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ) : null)}
                <text x={size / 2} y={size / 2 - 6} className={s.donutCenter} style={{ fill: centerText.color }}>{centerText.value}</text>
                <text x={size / 2} y={size / 2 + 14} className={s.donutSublabel}>{centerText.label}</text>
            </svg>
            <div className={s.legend}>
                {segments.map((seg, i) => (
                    <div
                        key={seg.label}
                        className={`${s.legendItem} ${hovered === i ? s.legendItemActive : ''}`}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <span className={s.legendDot} style={{ background: seg.color }} />
                        {seg.label}
                        <span className={s.legendValue}>{seg.value}</span>
                    </div>
                ))}
                <div className={s.legendItem}>
                    <span className={s.legendDot} style={{ background: 'var(--text-muted)' }} />
                    Total
                    <span className={s.legendValue}>{total}</span>
                </div>
            </div>
        </div>
    );
};

/* ── Game History Row ── */

interface GameHistoryRowProps {
    game: GamesResult;
    playerId: number;
    eloDelta?: number;
}

const GameHistoryRow: FC<GameHistoryRowProps> = ({ game, playerId, eloDelta }) => {
    const result = calculateGameResult(game, playerId);
    const isWin = result === 'win';
    const isDraw = result === 'draw';
    const resultLabel = isWin ? 'Win' : isDraw ? 'Draw' : 'Loss';
    const resultClass = isWin ? s.resultWin : isDraw ? s.resultDraw : s.resultLoss;

    const opponent = isWin ? game.loser : game.winner;
    const opponentName = opponent?.name || (isDraw ? '—' : 'Unknown');
    const opponentId = opponent?.ID;

    return (
        <tr>
            <td>
                <span className={`${s.resultBadge} ${resultClass}`}>{resultLabel}</span>
            </td>
            <td>
                {opponentId ? (
                    <Link to={`/players/${opponentId}`} className={s.opponentLink}>{opponentName}</Link>
                ) : (
                    <span>{opponentName}</span>
                )}
            </td>
            <td>
                {eloDelta !== undefined ? (
                    <span className={`${s.eloDelta} ${eloDelta > 0 ? s.eloUp : eloDelta < 0 ? s.eloDown : s.eloFlat}`}>
                        {eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`}
                    </span>
                ) : (
                    <span className={s.eloFlat}>—</span>
                )}
            </td>
            <td>
                {game.match_id ? (
                    <Link to={`/matches/search?ids=${game.match_id}`} className={s.matchLink}>
                        Match #{game.match_id}
                    </Link>
                ) : '—'}
            </td>
            <td>
                <span className={s.date}>{prettyDate(String(game.UpdatedAt))}</span>
            </td>
        </tr>
    );
};

export default PlayerDetail;
