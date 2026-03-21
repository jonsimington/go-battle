import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { MatchesResult } from '../../../models/MatchesResult';
import { PlayersResult } from '../../../models/PlayersResult';
import { HistoricalElo } from '../../../models/HistoricalElo';
import { Timer } from '../../Common/Timer';
import ELOBadge from '../../Common/ELO';
import { getApiUrl } from '../../../utils/utils';
import { RefreshButton } from '../../Common';
import { SwissFlowChart, PlayerFlowData, TickResult } from './SwissFlowChart';
import './TournamentBracket.css';

interface Round {
    roundNumber: number;
    matches: MatchesResult[];
}

interface MatchPlayer {
    id: number;
    name: string;
    score?: number;
    isWinner?: boolean;
    wins?: number;
    losses?: number;
    draws?: number;
    elo?: number;
    elo_history?: HistoricalElo[];
}

interface BracketMatch {
    id: number;
    roundNumber: number;
    player1: MatchPlayer;
    player2: MatchPlayer;
    status: string;
    numGames: number;
    completedGames: number;
    isDraw: boolean;
    startedAt?: Date;
    endedAt?: Date;
}

interface PlayerStatus {
    id: number;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    score: number;
}

interface StandingsEntry extends PlayerStatus {
    elo?: number;
    elo_history?: HistoricalElo[];
}

type TabId = 'standings' | 'rounds' | 'flow';

const TABS: { id: TabId; label: string }[] = [
    { id: 'standings', label: 'Standings' },
    { id: 'rounds', label: 'Rounds' },
    { id: 'flow', label: 'Score Flow' },
];

export function TournamentBracket(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState<TournamentsResult | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
    const [playerStatus, setPlayerStatus] = useState<Map<number, PlayerStatus>>(new Map());
    const [matchesWithDetailedGames, setMatchesWithDetailedGames] = useState<Map<number, MatchesResult>>(new Map());
    const [activeTab, setActiveTab] = useState<TabId>('standings');
    const [hoveredRoundPlayerId, setHoveredRoundPlayerId] = useState<number | null>(null);
    const roundsContainerRef = useRef<HTMLDivElement>(null);
    const matchCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const apiUrl = getApiUrl();

    // fetch tournament data when component mounts
    useEffect(() => {
        if (id) {
            fetchTournament(parseInt(id));
        }
    }, [id]);
    
    // organize tournament data when tournament or matchesWithDetailedGames change
    useEffect(() => {
        if (tournament && matchesWithDetailedGames.size > 0) {
            organizeTournamentData(tournament);
        }
    }, [tournament, matchesWithDetailedGames]);

    const fetchTournament = async (tournamentId: number) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${apiUrl}/tournaments?ids=${tournamentId}`, {mode:'cors'});
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const json = await response.json();
            // Handle paginated response format: { data: [...], page, pageSize, totalCount, totalPages }
            const data = Array.isArray(json) ? json : json.data;
            if (data && data.length > 0) {
                setTournament(data[0]);
                
                const matchIds = data[0].matches?.map((m: MatchesResult) => m.ID).join(',');
                
                if (matchIds) {
                    fetchDetailedMatches(matchIds);
                } else {
                    setLoading(false);
                }
            } else {
                setError('Tournament not found');
                setLoading(false);
            }
        } catch (err) {
            setLoading(false);
        }
    };
    
    const fetchDetailedMatches = async (matchIds: string) => {
        if (!matchIds) return;
        
        try {
            const response = await fetch(`${apiUrl}/matches?ids=${matchIds}&page_size=100`, {mode:'cors'});
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const matchesJson = await response.json();
            // Handle paginated response format: { data: [...], page, pageSize, totalCount, totalPages }
            const matchesData = Array.isArray(matchesJson) ? matchesJson : matchesJson.data;
            console.log("Detailed matches data fetched:", matchesData);
            
            const detailedMatchesMap = new Map<number, MatchesResult>();
            (matchesData ?? []).forEach((match: MatchesResult) => {
                detailedMatchesMap.set(match.ID, match);
            });
            
            setMatchesWithDetailedGames(detailedMatchesMap);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch detailed match data:", err);
            setLoading(false);
        }
    };

    const organizeTournamentData = (tournament: TournamentsResult) => {
        console.log(`got tournament data: ${JSON.stringify(tournament)}`);
        
        // Group matches by round (based on creation time)
        const sortedMatches = [...tournament.matches].sort((a, b) => 
            new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
        );
        
        // Initialize player status tracking
        const playerStatusMap = new Map<number, PlayerStatus>();
        tournament.players.forEach(player => {
            const games = player.games || [];
            let wins = games.filter(g => g.winner_id === player.ID).length;
            let losses = games.filter(g => g.loser_id === player.ID).length;
            let draws = games.filter(g => g.draw).length;

            playerStatusMap.set(player.ID, {
                id: player.ID,
                name: player.name,
                wins: wins,
                losses: losses,
                draws: draws,
                score: wins + (draws * 0.5)
            });
        });
        
        // Number of rounds in Swiss tournament
        const maxRounds = Math.ceil(Math.log2(tournament.players.length));
        
        const organizedRounds: Round[] = [];
        let bracketMatchesArray: BracketMatch[] = [];
        
        for (let i = 0; i < maxRounds; i++) {
            organizedRounds.push({
                roundNumber: i + 1,
                matches: []
            });
        }
        
        // Process all matches to update player status and assign to rounds
        sortedMatches.forEach(match => {
            if (!match.players || match.players.length === 0) return;
            
            // Determine which round this match belongs to based on creation time
            const roundIdx = Math.min(
                Math.floor(sortedMatches.indexOf(match) / (tournament.players.length / 2)),
                maxRounds - 1
            );
            const round = organizedRounds[roundIdx];
            
            // Add to round's matches
            round.matches.push(match);
            
            const player1 = match.players[0];
            const player2 = match.players.length > 1 ? match.players[1] : null;

            // Get detailed match information
            const detailedMatch = matchesWithDetailedGames.get(match.ID);
            
            // Calculate match results
            let completedGames = 0;
            let isDraw = false;

            const player1Score = calculateScore(player1, match);
            const player2Score = player2 ? calculateScore(player2, match) : 0;
            const player1IsWinner = player1Score > player2Score;
            const player2IsWinner = player2 ? player2Score > player1Score : false;
            
            if (detailedMatch && detailedMatch.games) {
                completedGames = detailedMatch.games.filter(g => g.status === "Complete").length;
            } else {
                completedGames = match.games.filter(g => g.status === "Complete").length;
            }
            
            const player1Status = playerStatusMap.get(player1.ID);
            const player2Status = player2 ? playerStatusMap.get(player2.ID) : undefined;
            
            bracketMatchesArray.push({
                id: match.ID,
                roundNumber: roundIdx + 1,
                player1: {
                    id: player1.ID,
                    name: player1.name,
                    score: player1Score,
                    isWinner: player1IsWinner,
                    wins: player1Status?.wins || 0,
                    losses: player1Status?.losses || 0,
                    draws: player1Status?.draws || 0,
                    elo: player1.elo,
                    elo_history: player1.elo_history
                },
                player2: player2 ? {
                    id: player2.ID, 
                    name: player2.name,
                    score: player2Score,
                    isWinner: player2IsWinner,
                    wins: player2Status?.wins || 0,
                    losses: player2Status?.losses || 0,
                    draws: player2Status?.draws || 0,
                    elo: player2.elo,
                    elo_history: player2.elo_history
                } : {
                    id: 0,
                    name: 'Bye',
                    score: 0,
                    isWinner: false
                },
                status: match.status,
                numGames: match.numGames,
                completedGames: completedGames,
                isDraw: isDraw,
                startedAt: match.start_time ? new Date(match.start_time) : undefined,
                endedAt: match.status === "Complete" && match.end_time ? new Date(match.end_time) : undefined
            });
        });
        
        setRounds(organizedRounds);
        setBracketMatches(bracketMatchesArray);
        setPlayerStatus(playerStatusMap);
    };

    const calculateScore = (player: PlayersResult, match: MatchesResult) => {
        const matchGames = matchesWithDetailedGames.get(match.ID)?.games || match.games;
        const wins = matchGames.filter((g: any) => g.winner_id === player.ID && g.status === "Complete").length;
        const draws = matchGames.filter((g: any) => g.draw && g.status === "Complete").length;
        return wins + (draws * 0.5);
    };

    const refreshTournamentData = async () => {
        if (!id) return;
        try {
            setMatchesWithDetailedGames(new Map());
            const response = await fetch(`${apiUrl}/tournaments?ids=${id}`, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const json = await response.json();
            const data = Array.isArray(json) ? json : json.data;
            if (data && data.length > 0) {
                setTournament(data[0]);
                const matchIds = data[0].matches.map((m: MatchesResult) => m.ID).join(',');
                if (matchIds) {
                    const matchResponse = await fetch(`${apiUrl}/matches?ids=${matchIds}&page_size=100`, { mode: 'cors' });
                    if (!matchResponse.ok) throw new Error(`HTTP error! Status: ${matchResponse.status}`);
                    const matchesJson = await matchResponse.json();
                    const matchesData = Array.isArray(matchesJson) ? matchesJson : matchesJson.data;
                    const detailedMatchesMap = new Map<number, MatchesResult>();
                    (matchesData ?? []).forEach((match: MatchesResult) => {
                        detailedMatchesMap.set(match.ID, match);
                    });
                    setMatchesWithDetailedGames(detailedMatchesMap);
                }
            } else {
                setError('Tournament not found');
            }
        } catch (err) {
            setError(`Failed to refresh: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // ── Derived data ──

    const standings: StandingsEntry[] = useMemo(() => {
        const map = new Map<number, StandingsEntry>();
        tournament?.players.forEach(p => {
            map.set(p.ID, {
                id: p.ID, name: p.name,
                wins: 0, losses: 0, draws: 0, score: 0,
                elo: p.elo, elo_history: p.elo_history,
            });
        });

        bracketMatches.forEach(match => {
            if (match.status === "Pending") return;
            const p1 = map.get(match.player1.id);
            const p2 = map.get(match.player2.id);
            if (!p1) return;

            const detailedMatch = matchesWithDetailedGames.get(match.id);
            const games = detailedMatch?.games || [];
            games.filter(g => g.status === "Complete").forEach(game => {
                if (game.draw) {
                    p1.draws++;
                    if (p2) p2.draws++;
                } else if (game.winner_id === p1.id) {
                    p1.wins++;
                    if (p2) p2.losses++;
                } else if (p2 && game.winner_id === p2.id) {
                    p2.wins++;
                    p1.losses++;
                }
            });
            p1.score = p1.wins + (p1.draws * 0.5);
            if (p2) p2.score = p2.wins + (p2.draws * 0.5);
        });

        return Array.from(map.values()).sort((a, b) => b.score - a.score);
    }, [bracketMatches, matchesWithDetailedGames, tournament]);

    const flowRoundCount = useMemo(() => {
        let max = 0;
        for (const m of bracketMatches) {
            if (m.roundNumber > max) max = m.roundNumber;
        }
        return max;
    }, [bracketMatches]);

    const gamesPerRound = useMemo(() => {
        let max = 0;
        for (const m of bracketMatches) {
            if (m.numGames > max) max = m.numGames;
        }
        return Math.max(max, 1);
    }, [bracketMatches]);

    const flowData: PlayerFlowData[] = useMemo(() => {
        if (!tournament || flowRoundCount === 0) return [];
        const totalTicks = 1 + gamesPerRound * flowRoundCount;

        // Build player -> round -> match lookup
        const playerRoundMatch = new Map<number, Map<number, BracketMatch>>();
        bracketMatches.forEach(match => {
            const roundIdx = match.roundNumber - 1;
            [match.player1.id, match.player2.id].forEach(pid => {
                if (pid === 0) return;
                if (!playerRoundMatch.has(pid)) playerRoundMatch.set(pid, new Map());
                playerRoundMatch.get(pid)!.set(roundIdx, match);
            });
        });

        return tournament.players.map(p => {
            const scores = new Array(totalTicks).fill(0);
            const completed = new Array(totalTicks).fill(false);
            const tickResults: (TickResult | null)[] = new Array(totalTicks).fill(null);
            completed[0] = true; // tick 0 is the start
            let cumulative = 0;

            for (let roundIdx = 0; roundIdx < flowRoundCount; roundIdx++) {
                const match = playerRoundMatch.get(p.ID)?.get(roundIdx);
                const startTick = 1 + roundIdx * gamesPerRound;
                const opponent = match
                    ? (match.player1.id === p.ID ? match.player2.name : match.player1.name)
                    : undefined;

                if (match) {
                    const detailedMatch = matchesWithDetailedGames.get(match.id);
                    const games = (detailedMatch?.games || [])
                        .filter(g => g.status === "Complete")
                        .sort((a, b) => new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime());

                    for (let g = 0; g < gamesPerRound; g++) {
                        if (g < games.length) {
                            const game = games[g];
                            const result: TickResult['result'] = game.draw
                                ? 'draw'
                                : game.winner_id === p.ID ? 'win' : 'loss';
                            if (game.draw) cumulative += 0.5;
                            else if (game.winner_id === p.ID) cumulative += 1;
                            completed[startTick + g] = true;
                            tickResults[startTick + g] = {
                                result,
                                opponent,
                                round: roundIdx + 1,
                                game: g + 1,
                            };
                        } else {
                            tickResults[startTick + g] = {
                                result: 'pending',
                                opponent,
                                round: roundIdx + 1,
                                game: g + 1,
                            };
                        }
                        scores[startTick + g] = cumulative;
                    }
                } else {
                    for (let g = 0; g < gamesPerRound; g++) {
                        scores[startTick + g] = cumulative;
                        tickResults[startTick + g] = {
                            result: 'pending',
                            round: roundIdx + 1,
                            game: g + 1,
                        };
                    }
                }
            }

            return {
                playerId: p.ID,
                playerName: p.name,
                cumulativeScores: scores,
                completedTicks: completed,
                tickResults,
                elo: p.elo,
            };
        });
    }, [tournament, flowRoundCount, gamesPerRound, bracketMatches, matchesWithDetailedGames]);

    // ── Sub-renderers ──

    const renderStandings = () => (
        <table className="tb-standings">
            <thead>
                <tr>
                    <th className="tb-th-rank">#</th>
                    <th>Player</th>
                    <th className="tb-th-num">Score</th>
                    <th className="tb-th-num">W</th>
                    <th className="tb-th-num">L</th>
                    <th className="tb-th-num">D</th>
                    <th className="tb-th-elo">ELO</th>
                </tr>
            </thead>
            <tbody>
                {standings.map((entry, idx) => (
                    <tr
                        key={entry.id}
                        className="tb-standings-row"
                        onClick={() => navigate(`/players/search?ids=${entry.id}`)}
                    >
                        <td className={`tb-rank ${idx < 3 ? `tb-rank-${idx + 1}` : ''}`}>{idx + 1}</td>
                        <td className="tb-player-cell">{entry.name}</td>
                        <td className="tb-score-cell">{entry.score % 1 === 0 ? entry.score : entry.score.toFixed(1)}</td>
                        <td className="tb-num-cell">{entry.wins}</td>
                        <td className="tb-num-cell">{entry.losses}</td>
                        <td className="tb-num-cell">{entry.draws}</td>
                        <td className="tb-elo-cell">
                            {entry.elo !== undefined && (
                                <ELOBadge elo={entry.elo} eloHistory={entry.elo_history} />
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // Build lookup: playerId -> sorted list of matchIds the player is in
    const playerMatchIds = useMemo(() => {
        const map = new Map<number, number[]>();
        bracketMatches
            .slice()
            .sort((a, b) => a.roundNumber - b.roundNumber)
            .forEach(m => {
                for (const pid of [m.player1.id, m.player2.id]) {
                    if (pid === 0) continue;
                    if (!map.has(pid)) map.set(pid, []);
                    map.get(pid)!.push(m.id);
                }
            });
        return map;
    }, [bracketMatches]);

    const registerMatchCard = useCallback((matchId: number, el: HTMLDivElement | null) => {
        if (el) matchCardRefs.current.set(matchId, el);
        else matchCardRefs.current.delete(matchId);
    }, []);

    const renderMatchCard = (match: BracketMatch) => {
        const isBye = match.player2.id === 0;
        const detailedMatch = matchesWithDetailedGames.get(match.id);
        const games = detailedMatch?.games || [];

        const p1W = games.filter(g => g.winner_id === match.player1.id && g.status === "Complete").length;
        const p1L = games.filter(g => g.loser_id === match.player1.id && g.status === "Complete").length;
        const p1D = games.filter(g => g.draw && g.status === "Complete").length;
        const p2W = !isBye ? games.filter(g => g.winner_id === match.player2.id && g.status === "Complete").length : 0;
        const p2L = !isBye ? games.filter(g => g.loser_id === match.player2.id && g.status === "Complete").length : 0;
        const p2D = !isBye ? games.filter(g => g.draw && g.status === "Complete").length : 0;

        const p1Class = isBye ? 'tb-row-win'
            : match.status === "Complete"
                ? (match.player1.isWinner ? 'tb-row-win' : match.isDraw ? 'tb-row-draw' : '')
                : match.status === "In Progress" && (match.player1.score ?? 0) > (match.player2.score ?? 0) ? 'tb-row-leading' : '';

        const p2Class = isBye ? 'tb-row-bye'
            : match.status === "Complete"
                ? (match.player2.isWinner ? 'tb-row-win' : match.isDraw ? 'tb-row-draw' : '')
                : match.status === "In Progress" && (match.player2.score ?? 0) > (match.player1.score ?? 0) ? 'tb-row-leading' : '';

        const statusClass = match.status === "Complete" ? "complete" : match.status === "In Progress" ? "active" : "pending";

        const isHighlighted = hoveredRoundPlayerId !== null &&
            (match.player1.id === hoveredRoundPlayerId || match.player2.id === hoveredRoundPlayerId);
        const isDimmed = hoveredRoundPlayerId !== null && !isHighlighted;

        return (
            <div
                key={match.id}
                ref={(el) => registerMatchCard(match.id, el)}
                className={`tb-match-card ${isBye ? 'tb-match-card-bye' : ''} ${isDimmed ? 'tb-match-dimmed' : ''} ${isHighlighted ? 'tb-match-highlighted' : ''}`}
                onClick={() => navigate(`/matches/search?ids=${match.id}`)}
            >
                <div
                    className={`tb-match-row ${p1Class}`}
                    onMouseEnter={() => setHoveredRoundPlayerId(match.player1.id)}
                    onMouseLeave={() => setHoveredRoundPlayerId(null)}
                >
                    <span className="tb-match-player">{match.player1.name}</span>
                    {match.player1.elo !== undefined && (
                        <ELOBadge elo={match.player1.elo} eloHistory={match.player1.elo_history} />
                    )}
                    <span className="tb-match-record">({p1W}-{p1L}-{p1D})</span>
                    {match.status !== "Pending" && (
                        <span className="tb-match-score">{(match.player1.score ?? 0).toFixed(1)}</span>
                    )}
                </div>
                <div
                    className={`tb-match-row ${p2Class}`}
                    onMouseEnter={() => { if (!isBye) setHoveredRoundPlayerId(match.player2.id); }}
                    onMouseLeave={() => setHoveredRoundPlayerId(null)}
                >
                    <span className="tb-match-player">{match.player2.name}</span>
                    {!isBye && (
                        <>
                            {match.player2.elo !== undefined && (
                                <ELOBadge elo={match.player2.elo} eloHistory={match.player2.elo_history} />
                            )}
                            <span className="tb-match-record">({p2W}-{p2L}-{p2D})</span>
                            {match.status !== "Pending" && (
                                <span className="tb-match-score">{(match.player2.score ?? 0).toFixed(1)}</span>
                            )}
                        </>
                    )}
                </div>
                <div className="tb-match-footer">
                    <span className="tb-match-id">M{match.id}</span>
                    {!isBye && match.completedGames > 0 && (
                        <span className="tb-match-progress">{match.completedGames}/{match.numGames}</span>
                    )}
                    {!isBye && match.status === "In Progress" && match.startedAt && (
                        <Timer startTime={match.startedAt} />
                    )}
                    {!isBye && match.status === "Complete" && match.startedAt && match.endedAt && (
                        <Timer startTime={match.startedAt} endTime={match.endedAt} />
                    )}
                    <span className={`tb-match-status tb-ms-${statusClass}`}>
                        <span className={`tb-dot tb-dot-${statusClass}`} />
                        {isBye ? 'Bye' : match.status}
                    </span>
                </div>
            </div>
        );
    };

    /** Compute SVG connector lines between a hovered player's match cards */
    const getConnectorLines = (): { x1: number; y1: number; x2: number; y2: number }[] => {
        if (!hoveredRoundPlayerId || !roundsContainerRef.current) return [];
        const matchIds = playerMatchIds.get(hoveredRoundPlayerId);
        if (!matchIds || matchIds.length < 2) return [];

        const containerRect = roundsContainerRef.current.getBoundingClientRect();
        const scrollLeft = roundsContainerRef.current.scrollLeft;

        const points: { x: number; y: number }[] = [];
        for (const mid of matchIds) {
            const el = matchCardRefs.current.get(mid);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            points.push({
                x: r.left - containerRect.left + scrollLeft + r.width / 2,
                y: r.top - containerRect.top + r.height / 2,
            });
        }

        const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let i = 0; i < points.length - 1; i++) {
            lines.push({
                x1: points[i].x,
                y1: points[i].y,
                x2: points[i + 1].x,
                y2: points[i + 1].y,
            });
        }
        return lines;
    };

    const renderRounds = () => {
        const lines = getConnectorLines();
        return (
            <div className="tb-rounds-wrapper">
                <div className="tb-rounds" ref={roundsContainerRef}>
                    {rounds.map(round => {
                        const roundMatches = bracketMatches
                            .filter(m => m.roundNumber === round.roundNumber)
                            .sort((a, b) => {
                                const aS = (a.player1.wins || 0) + (a.player2.wins || 0);
                                const bS = (b.player1.wins || 0) + (b.player2.wins || 0);
                                return bS - aS;
                            });
                        return (
                            <div className="tb-round-col" key={round.roundNumber}>
                                <div className="tb-round-header">
                                    <span>Round {round.roundNumber}</span>
                                    {(() => {
                                        const started = roundMatches.filter(m => m.startedAt);
                                        if (started.length === 0) return null;
                                        const earliest = started.reduce(
                                            (min, m) => m.startedAt! < min ? m.startedAt! : min,
                                            started[0].startedAt!
                                        );
                                        const allComplete = roundMatches.length > 0 &&
                                            roundMatches.every(m => m.status === 'Complete' || m.player2.id === 0);
                                        if (allComplete) {
                                            const completed = started.filter(m => m.endedAt);
                                            if (completed.length === 0) return null;
                                            const latest = completed.reduce(
                                                (max, m) => m.endedAt! > max ? m.endedAt! : max,
                                                completed[0].endedAt!
                                            );
                                            return <Timer startTime={earliest} endTime={latest} />;
                                        }
                                        return <Timer startTime={earliest} />;
                                    })()}
                                </div>
                                <div className="tb-match-list">
                                    {roundMatches.length === 0 ? (
                                        <div className="tb-empty-round">No matches</div>
                                    ) : (
                                        roundMatches.map(match => renderMatchCard(match))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* SVG overlay for connector lines */}
                    {lines.length > 0 && (
                        <svg className="tb-connector-svg">
                            {lines.map((l, i) => (
                                <line
                                    key={i}
                                    x1={l.x1} y1={l.y1}
                                    x2={l.x2} y2={l.y2}
                                    stroke="var(--accent, #58a6ff)"
                                    strokeWidth={1.5}
                                    strokeDasharray="6,4"
                                    opacity={0.6}
                                />
                            ))}
                        </svg>
                    )}
                </div>
            </div>
        );
    };

    const renderFlow = () => {
        if (flowData.length === 0 || flowRoundCount === 0) {
            return <div className="tb-empty">No completed round data to display.</div>;
        }
        return (
            <div className="tb-flow-wrap">
                <SwissFlowChart players={flowData} roundCount={flowRoundCount} gamesPerRound={gamesPerRound} />
            </div>
        );
    };

    // ── Status helper ──

    const statusDotClass = tournament?.status === "Complete" ? "complete"
        : tournament?.status === "In Progress" ? "active"
        : "pending";

    // ── Render ──

    if (loading) {
        return (
            <div className="tb-page">
                <div className="tb-loading"><div className="tb-spinner" /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tb-page">
                <div className="tb-error">
                    <p>{error}</p>
                    <button className="tb-btn" onClick={() => navigate('/tournaments/search')}>
                        Back to Tournaments
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tb-page">
            <div className="tb-header">
                <div className="tb-header-left">
                    <h1 className="tb-title">{tournament?.name || 'Tournament'}</h1>
                    <span className={`tb-dot tb-dot-${statusDotClass}`} />
                    <span className="tb-meta">{tournament?.status}</span>
                    <span className="tb-type-tag">{tournament?.type}</span>
                    {tournament?.winner && tournament.winner.ID !== 0 && (
                        <span className="tb-winner-tag">Winner: {tournament.winner.name}</span>
                    )}
                </div>
                <div className="tb-header-right">
                    <RefreshButton onRefresh={refreshTournamentData} />
                    <button className="tb-link-btn" onClick={() => navigate('/tournaments/search')}>
                        ← Back
                    </button>
                </div>
            </div>

            <div className="tb-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tb-tab ${activeTab === tab.id ? 'tb-tab-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="tb-content">
                {tournament?.players.length === 0 ? (
                    <div className="tb-empty">This tournament has no players.</div>
                ) : bracketMatches.length === 0 ? (
                    <div className="tb-empty">No matches have been created for this tournament yet.</div>
                ) : (
                    <>
                        {activeTab === 'standings' && renderStandings()}
                        {activeTab === 'rounds' && renderRounds()}
                        {activeTab === 'flow' && renderFlow()}
                    </>
                )}
            </div>
        </div>
    );
}

export default TournamentBracket;
