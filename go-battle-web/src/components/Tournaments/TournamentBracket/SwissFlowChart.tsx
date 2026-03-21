import React, { useMemo, useState, useCallback } from 'react';

export interface TickResult {
    result: 'win' | 'loss' | 'draw' | 'pending';
    opponent?: string;
    round: number;
    game: number;
}

export interface PlayerFlowData {
    playerId: number;
    playerName: string;
    cumulativeScores: number[];
    /** true = game result exists, false = game not yet played */
    completedTicks: boolean[];
    /** Per-tick game result info for tooltips. null for tick 0 (start). */
    tickResults: (TickResult | null)[];
    elo: number;
}

interface SwissFlowChartProps {
    players: PlayerFlowData[];
    roundCount: number;
    gamesPerRound: number;
}

const COLORS = [
    '#58a6ff', '#3fb950', '#f78166', '#d29922', '#bc8cff',
    '#79c0ff', '#56d364', '#ffa657', '#e3b341', '#d2a8ff',
    '#ff7b72', '#7ee787', '#a5d6ff', '#f2cc60', '#eddeff',
    '#39d353', '#db6d28', '#388bfd', '#bf8700', '#8b949e',
    '#da3633', '#76e3ea', '#d4a72c', '#54aeff', '#986ee2',
];

const RESULT_LABELS: Record<TickResult['result'], string> = {
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',
    pending: 'Pending',
};

const RESULT_COLORS: Record<TickResult['result'], string> = {
    win: '#3fb950',
    loss: '#f78166',
    draw: '#d29922',
    pending: '#484f58',
};

interface HoveredDot {
    playerId: number;
    playerName: string;
    tick: number;
    cx: number;
    cy: number;
    color: string;
    tickResult: TickResult;
}

export function SwissFlowChart({ players, roundCount, gamesPerRound }: SwissFlowChartProps): JSX.Element | null {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null);

    const totalTicks = 1 + gamesPerRound * roundCount;

    const margin = { top: 20, right: 150, bottom: 48, left: 44 };
    const width = 900;
    const innerW = width - margin.left - margin.right;
    const innerH = Math.max(220, Math.min(400, players.length * 18));
    const height = innerH + margin.top + margin.bottom;

    const maxScore = useMemo(() => {
        let m = 0;
        for (const p of players) {
            for (const s of p.cumulativeScores) {
                if (s > m) m = s;
            }
        }
        return Math.max(m, 1);
    }, [players]);

    const sorted = useMemo(() =>
        [...players].sort((a, b) =>
            (b.cumulativeScores[b.cumulativeScores.length - 1] || 0) -
            (a.cumulativeScores[a.cumulativeScores.length - 1] || 0)
        ), [players]);

    const x = useCallback((tick: number) =>
        margin.left + (tick / Math.max(totalTicks - 1, 1)) * innerW,
        [margin.left, innerW, totalTicks]);

    const y = useCallback((score: number) =>
        margin.top + innerH - (score / maxScore) * innerH,
        [margin.top, innerH, maxScore]);

    const roundEndTicks = useMemo(() =>
        Array.from({ length: roundCount }, (_, r) => (r + 1) * gamesPerRound),
        [roundCount, gamesPerRound]);

    const labels = useMemo(() => {
        const gap = 13;
        const items = sorted.map(p => ({
            id: p.playerId,
            name: p.playerName,
            dataY: y(p.cumulativeScores[p.cumulativeScores.length - 1] || 0),
            labelY: 0,
        }));
        items.sort((a, b) => a.dataY - b.dataY);
        for (let i = 0; i < items.length; i++) {
            items[i].labelY = i === 0
                ? items[i].dataY
                : Math.max(items[i].dataY, items[i - 1].labelY + gap);
        }
        return new Map(items.map(item => [item.id, item]));
    }, [sorted, y]);

    const pathD = useCallback((scores: number[]) =>
        scores.slice(0, totalTicks).map((s, i) =>
            `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s).toFixed(1)}`
        ).join(''),
        [x, y, totalTicks]);

    /** Split a player's path into solid (completed) and dashed (pending) segments */
    const splitPaths = useCallback((scores: number[], completed: boolean[]) => {
        // Find last tick with real data
        let lastCompleted = 0;
        for (let i = 0; i < Math.min(scores.length, totalTicks); i++) {
            if (completed[i]) lastCompleted = i;
        }

        const hasPending = lastCompleted < totalTicks - 1;

        const solidD = scores.slice(0, lastCompleted + 1).map((s, i) =>
            `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s).toFixed(1)}`
        ).join('');

        let dashedD = '';
        if (hasPending) {
            dashedD = scores.slice(lastCompleted, totalTicks).map((s, i) =>
                `${i === 0 ? 'M' : 'L'}${x(lastCompleted + i).toFixed(1)},${y(s).toFixed(1)}`
            ).join('');
        }

        return { solidD, dashedD };
    }, [x, y, totalTicks]);

    if (roundCount < 1 || players.length === 0) return null;

    const gridCount = Math.ceil(maxScore);

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Score progression chart"
            style={{ width: '100%', height: 'auto', display: 'block' }}
        >
            {/* Horizontal grid lines + Y labels */}
            {Array.from({ length: gridCount + 1 }, (_, i) => (
                <g key={`g${i}`}>
                    <line
                        x1={margin.left} y1={y(i)}
                        x2={margin.left + innerW} y2={y(i)}
                        style={{ stroke: 'var(--border-muted, #21262d)', strokeWidth: 0.5 }}
                    />
                    <text
                        x={margin.left - 8} y={y(i) + 3.5}
                        textAnchor="end"
                        style={{ fontSize: 10, fill: 'var(--text-muted, #484f58)' }}
                    >{i}</text>
                </g>
            ))}

            {/* Round separator lines (solid between rounds) */}
            {roundEndTicks.slice(0, -1).map((tick, r) => {
                const sepX = (x(tick) + x(tick + 1)) / 2;
                return (
                    <line
                        key={`sep${r}`}
                        x1={sepX} y1={margin.top}
                        x2={sepX} y2={margin.top + innerH}
                        style={{ stroke: 'var(--border-default, #30363d)', strokeWidth: 0.75 }}
                    />
                );
            })}

            {/* Dashed gridlines at round-end ticks */}
            {roundEndTicks.map((tick, r) => (
                <line
                    key={`re${r}`}
                    x1={x(tick)} y1={margin.top}
                    x2={x(tick)} y2={margin.top + innerH}
                    style={{ stroke: 'var(--border-muted, #21262d)', strokeWidth: 0.5, strokeDasharray: '3,3' }}
                />
            ))}

            {/* Dashed vertical gridlines for each game tick */}
            {Array.from({ length: totalTicks }, (_, i) => {
                if (i === 0 || roundEndTicks.includes(i)) return null;
                return (
                    <line
                        key={`gt${i}`}
                        x1={x(i)} y1={margin.top}
                        x2={x(i)} y2={margin.top + innerH}
                        style={{ stroke: 'var(--border-muted, #21262d)', strokeWidth: 0.3, strokeDasharray: '2,4' }}
                    />
                );
            })}

            {/* Round labels + game number sub-labels */}
            {roundEndTicks.map((tick, r) => {
                const roundStartTick = 1 + r * gamesPerRound;
                return (
                    <g key={`rl${r}`}>
                        {/* Round label centered over the round's game ticks */}
                        <text
                            x={(x(roundStartTick) + x(tick)) / 2}
                            y={height - 10}
                            textAnchor="middle"
                            style={{ fontSize: 11, fill: 'var(--text-secondary, #8b949e)' }}
                        >R{r + 1}</text>
                        {/* Game number labels */}
                        {Array.from({ length: gamesPerRound }, (_, g) => (
                            <text
                                key={g}
                                x={x(roundStartTick + g)}
                                y={height - 22}
                                textAnchor="middle"
                                style={{ fontSize: 8, fill: 'var(--text-muted, #484f58)' }}
                            >G{g + 1}</text>
                        ))}
                    </g>
                );
            })}

            {/* Player lines, dots, and labels */}
            {sorted.map((player, idx) => {
                const color = COLORS[idx % COLORS.length];
                const isHovered = hoveredId === player.playerId;
                const isDimmed = hoveredId !== null && !isHovered;
                const label = labels.get(player.playerId);
                const lastScore = player.cumulativeScores[player.cumulativeScores.length - 1] || 0;
                const lastX = x(totalTicks - 1);
                const lastDataY = y(lastScore);
                const { solidD, dashedD } = splitPaths(player.cumulativeScores, player.completedTicks);

                return (
                    <g
                        key={player.playerId}
                        onMouseEnter={() => setHoveredId(player.playerId)}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        {/* Wide invisible hit area */}
                        <path
                            d={pathD(player.cumulativeScores)}
                            fill="none" stroke="transparent" strokeWidth={14}
                            style={{ cursor: 'default' }}
                        />
                        {/* Solid line — completed games */}
                        <path
                            d={solidD}
                            fill="none"
                            stroke={color}
                            strokeWidth={isHovered ? 2.5 : 1.5}
                            opacity={isDimmed ? 0.1 : isHovered ? 1 : 0.5}
                            strokeLinejoin="round"
                        />
                        {/* Dashed line — pending games */}
                        {dashedD && (
                            <path
                                d={dashedD}
                                fill="none"
                                stroke={color}
                                strokeWidth={isHovered ? 2 : 1}
                                opacity={isDimmed ? 0.06 : isHovered ? 0.45 : 0.2}
                                strokeLinejoin="round"
                                strokeDasharray="4,3"
                            />
                        )}
                        {/* Data points */}
                        {player.cumulativeScores.slice(0, totalTicks).map((s, t) => {
                            if (t === 0) return null;
                            const isRoundEnd = roundEndTicks.includes(t);
                            const isPending = !player.completedTicks[t];
                            const tickResult = player.tickResults[t];
                            const dotCx = x(t);
                            const dotCy = y(s);

                            const onDotEnter = () => {
                                setHoveredId(player.playerId);
                                if (tickResult) {
                                    setHoveredDot({
                                        playerId: player.playerId,
                                        playerName: player.playerName,
                                        tick: t,
                                        cx: dotCx,
                                        cy: dotCy,
                                        color,
                                        tickResult,
                                    });
                                }
                            };
                            const onDotLeave = () => {
                                setHoveredDot(prev =>
                                    prev?.playerId === player.playerId && prev?.tick === t ? null : prev
                                );
                            };

                            if (isPending) {
                                return (
                                    <g key={t}>
                                        {/* Invisible larger hit area */}
                                        <circle
                                            cx={dotCx} cy={dotCy} r={8}
                                            fill="transparent"
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={onDotEnter}
                                            onMouseLeave={onDotLeave}
                                        />
                                        <circle
                                            cx={dotCx} cy={dotCy}
                                            r={isHovered ? 3 : 1.8}
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={isHovered ? 1.5 : 1}
                                            opacity={isDimmed ? 0.06 : isHovered ? 0.5 : 0.2}
                                            style={{ pointerEvents: 'none' }}
                                        />
                                    </g>
                                );
                            }

                            return (
                                <g key={t}>
                                    {/* Invisible larger hit area */}
                                    <circle
                                        cx={dotCx} cy={dotCy} r={8}
                                        fill="transparent"
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={onDotEnter}
                                        onMouseLeave={onDotLeave}
                                    />
                                    <circle
                                        cx={dotCx} cy={dotCy}
                                        r={isHovered ? (isRoundEnd ? 4 : 3) : (isRoundEnd ? 2.5 : 1.5)}
                                        fill={color}
                                        opacity={isDimmed ? 0.1 : isHovered ? 1 : 0.5}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                </g>
                            );
                        })}
                        {/* Leader line from last data point to label */}
                        {label && (
                            <>
                                <line
                                    x1={lastX + 4} y1={lastDataY}
                                    x2={lastX + 9} y2={label.labelY}
                                    stroke={color} strokeWidth={0.5}
                                    opacity={isDimmed ? 0.05 : 0.25}
                                />
                                <text
                                    x={lastX + 12} y={label.labelY + 3.5}
                                    style={{
                                        fontSize: isHovered ? 12 : 11,
                                        fill: isDimmed ? 'var(--text-muted, #484f58)' : color,
                                        fontWeight: isHovered ? 600 : 400,
                                        opacity: isDimmed ? 0.25 : 1,
                                    }}
                                >
                                    {player.playerName}
                                </text>
                            </>
                        )}
                    </g>
                );
            })}

            {/* Tooltip — rendered last so it's on top */}
            {hoveredDot && (() => {
                const { cx: dotX, cy: dotY, playerName, color: dotColor, tickResult: tr } = hoveredDot;
                const resultLabel = RESULT_LABELS[tr.result];
                const resultColor = RESULT_COLORS[tr.result];
                const line1 = `R${tr.round} G${tr.game}`;
                const line2 = resultLabel + (tr.opponent ? ` vs ${tr.opponent}` : '');

                // Estimate text width (rough: 6px per char at font-size 10)
                const maxChars = Math.max(line1.length + playerName.length + 3, line2.length);
                const tipW = Math.max(maxChars * 5.8 + 16, 90);
                const tipH = 38;
                const tipR = 4;

                // Position tooltip above the dot; flip down if too close to top
                const aboveY = dotY - tipH - 8;
                const flipDown = aboveY < 2;
                const tipY = flipDown ? dotY + 10 : aboveY;

                // Horizontally center on dot, but clamp to chart bounds
                let tipX = dotX - tipW / 2;
                tipX = Math.max(margin.left, Math.min(tipX, margin.left + innerW - tipW));

                return (
                    <g style={{ pointerEvents: 'none' }}>
                        <rect
                            x={tipX} y={tipY}
                            width={tipW} height={tipH}
                            rx={tipR} ry={tipR}
                            fill="var(--bg-overlay, #161b22)"
                            stroke="var(--border-default, #30363d)"
                            strokeWidth={0.5}
                            opacity={0.95}
                        />
                        <text
                            x={tipX + 8} y={tipY + 14}
                            style={{ fontSize: 10, fill: dotColor, fontWeight: 600 }}
                        >
                            {playerName} — {line1}
                        </text>
                        <text
                            x={tipX + 8} y={tipY + 28}
                            style={{ fontSize: 10, fill: resultColor, fontWeight: 500 }}
                        >
                            {line2}
                        </text>
                    </g>
                );
            })()}
        </svg>
    );
}
