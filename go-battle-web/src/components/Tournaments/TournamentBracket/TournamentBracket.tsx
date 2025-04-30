import React, { useEffect, useState, useRef } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { MatchesResult } from '../../../models/MatchesResult';
import './TournamentBracket.css';
import { PlayersResult } from '../../../models/PlayersResult';
import moment from 'moment';
import { Timer } from '../../Common/Timer';
import ELOBadge from '../../Common/ELO';
import { RefreshButton } from '../../Common';
import { HistoricalElo } from '../../../models/HistoricalElo';

interface TournamentBracketProps {}

interface Round {
    roundNumber: number;
    matches: MatchesResult[];
    brackets: {
        high: MatchesResult[];
        mid?: MatchesResult[];
        low?: MatchesResult[];
    };
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
    qualified?: boolean;
    eliminated?: boolean;
}

interface BracketMatch {
    id: number;
    roundNumber: number;
    bracketLevel: 'high' | 'mid' | 'low';
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
    qualified: boolean;
    eliminated: boolean;
}

interface GamelogPlayer {
    id: string;
    index: number;
    name: string;
    reason: string;
    disconnected: boolean;
    timeout: boolean;
}

export function TournamentBracket(): JSX.Element {
    const { id } = useParams<{id: string}>();
    const [tournament, setTournament] = useState<TournamentsResult | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
    const [playerStatus, setPlayerStatus] = useState<Map<number, PlayerStatus>>(new Map());
    const [matchesWithDetailedGames, setMatchesWithDetailedGames] = useState<Map<number, MatchesResult>>(new Map());
    
    const apiUrl = process.env.REACT_APP_API_URL;

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
            
            const data = await response.json();
            if (data && data.length > 0) {
                setTournament(data[0]);
                
                const matchIds = data[0].matches.map((m: MatchesResult) => m.ID).join(',');
                
                if (matchIds) {
                    fetchDetailedMatches(matchIds);
                }
                // We'll organize data in the useEffect after both data sources are loaded
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
            const response = await fetch(`${apiUrl}/matches?ids=${matchIds}`, {mode:'cors'});
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const matchesData = await response.json();
            console.log("Detailed matches data fetched:", matchesData);
            
            const detailedMatchesMap = new Map<number, MatchesResult>();
            matchesData.forEach((match: MatchesResult) => {
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

            let wins = player.games.filter(g => g.winner_id === player.ID).length;
            let losses = player.games.filter(g => g.loser_id === player.ID).length;
            let draws = player.games.filter(g => g.draw).length;

            console.log(`Player ${player.name} - Wins: ${wins}, Losses: ${losses}, Draws: ${draws}`);


            playerStatusMap.set(player.ID, {
                id: player.ID,
                name: player.name,
                wins: player.games.filter(g => g.winner_id === player.ID).length,
                losses: player.games.filter(g => g.loser_id === player.ID).length,
                draws: player.games.filter(g => g.draw).length,
                qualified: false,
                eliminated: false
            });
        });
        
        // Number of rounds in Swiss tournament
        const maxRounds = 5;
        
        const organizedRounds: Round[] = [];
        let bracketMatchesArray: BracketMatch[] = [];
        
        for (let i = 0; i < maxRounds; i++) {
            organizedRounds.push({
                roundNumber: i + 1,
                matches: [],
                brackets: {
                    high: [],
                    mid: i >= 1 ? [] : undefined, // mid bracket starts from round 2
                    low: i >= 1 ? [] : undefined  // low bracket starts from round 2
                }
            });
        }
        
        // Process all matches to update player status and assign to brackets
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
                // Count completed games
                completedGames = detailedMatch.games.filter(g => g.status === "Complete").length;             

                // Determine match winner if complete
                if (match.status === "Complete") {
                    
                    // Update player status tracking for qualification/elimination
                    if (player1IsWinner) {
                        const status = playerStatusMap.get(player1.ID);
                        if (status) {
                            if (status.wins >= 3) status.qualified = true;
                            playerStatusMap.set(player1.ID, status);
                        }
                        
                        if (player2) {
                            const status2 = player2 ? playerStatusMap.get(player2.ID) : undefined;
                            if (status2) {
                                if (status2.losses >= 3) status2.eliminated = true;
                                if (player2) {
                                    if (player2) {
                                        playerStatusMap.set(player2.ID, status2);
                                    }
                                }
                            }
                        }
                    } else if (player2IsWinner) {
                        const status2 = player2 ? playerStatusMap.get(player2.ID) : undefined;
                        if (status2) {
                            if (status2.wins >= 3) status2.qualified = true;
                            if (player2) {
                                playerStatusMap.set(player2.ID, status2);
                            }
                        }
                        
                        const status = playerStatusMap.get(player1.ID);
                        if (status) {
                            if (status.losses >= 3) status.eliminated = true;
                            playerStatusMap.set(player1.ID, status);
                        }
                    }
                }
            } else {
                completedGames = match.games.filter(g => g.status === "Complete").length;
            }
            
            // Determine bracket placement based on round number and player records
            let bracketLevel: 'high' | 'mid' | 'low' = 'high';
            
            // For first round, everyone starts in 'high' bracket
            if (roundIdx === 0) {
                bracketLevel = 'high';
                round.brackets.high.push(match);
            }
            // For subsequent rounds, figure out brackets based on player records
            else {
                const player1Status = playerStatusMap.get(player1.ID);
                const player2Status = player2 ? playerStatusMap.get(player2.ID) : undefined;
                
                // Use a heuristic based on the round and player's record to determine bracket
                const avgWins = (player1Status?.wins || 0) + (player2Status?.wins || 0);
                const avgLosses = (player1Status?.losses || 0) + (player2Status?.losses || 0);
                
                if (roundIdx === 1) {
                    // Round 2: winners in high, losers in low
                    if (avgWins > avgLosses) {
                        bracketLevel = 'high';
                        round.brackets.high?.push(match);
                    } else {
                        bracketLevel = 'low';
                        round.brackets.low?.push(match);
                    }
                } else {
                    // Rounds 3+: further bracket refinement
                    if (avgWins >= roundIdx) {
                        bracketLevel = 'high';
                        round.brackets.high.push(match);
                    } else if (avgLosses >= roundIdx) {
                        bracketLevel = 'low';
                        round.brackets.low?.push(match);
                    } else {
                        bracketLevel = 'mid';
                        round.brackets.mid?.push(match);
                    }
                }
            }
            
            const player1Status = playerStatusMap.get(player1.ID);
            const player2Status = player2 ? playerStatusMap.get(player2.ID) : undefined;
            
            bracketMatchesArray.push({
                id: match.ID,
                roundNumber: roundIdx + 1,
                bracketLevel: bracketLevel,
                player1: {
                    id: player1.ID,
                    name: player1.name,
                    score: player1Score,
                    isWinner: player1IsWinner,
                    wins: player1Status?.wins || 0,
                    losses: player1Status?.losses || 0,
                    draws: player1Status?.draws || 0,
                    elo: player1.elo,
                    elo_history: player1.elo_history,
                    qualified: player1Status?.qualified || false,
                    eliminated: player1Status?.eliminated || false
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
                    elo_history: player2.elo_history,
                    qualified: player2Status?.qualified || false,
                    eliminated: player2Status?.eliminated || false
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
    }

    const renderMatch = (match: BracketMatch) => {
        const matchUrl = `${window.location.origin}/matches/search?ids=${match.id}`;
        
        return (
            <Card className="bracket-match" key={`match-${match.id}`}>
                <Card.Header 
                    className="clickable-header"
                    onClick={() => window.location.href = matchUrl}
                >
                    <div className="d-flex justify-content-between align-items-center">
                        <small>
                            Match {match.id}
                            {match.completedGames > 0 && 
                             <span className="ms-1 text-muted">
                                ({match.completedGames}/{match.numGames || 0} games)
                             </span>
                            }
                        </small>
                        <Badge bg={match.status === "Complete" ? "success" : match.status === "In Progress" ? "primary" : "secondary"}>
                            {match.status}
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Body>
                    <div className={`player ${match.player1.isWinner ? 'winner' : ''}`}>
                        <span>{match.player1.name}</span>
                        {match.status !== "Pending" && (
                            <span className="score">
                                {match.player1.score != null ? (match.player1.score % 1 === 0 ? match.player1.score : match.player1.score.toFixed(1)) : 0}
                            </span>
                        )}
                    </div>
                    <div className={`player ${match.player2.isWinner ? 'winner' : ''}`}>
                        <span>{match.player2.name}</span>
                        {match.status !== "Pending" && (
                            <span className="score">
                                {match.player2.score != null ? (match.player2.score % 1 === 0 ? match.player2.score : match.player2.score.toFixed(1)) : 0}
                            </span>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    // New component for Swiss bracket visualization
    const SwissBracketVisualizer = () => {
        return (
            <div className="swiss-bracket-container">
                {rounds.map((round, roundIndex) => (
                    <div className="swiss-round" key={`round-${round.roundNumber}`}>
                        <div className="round-column">
                            <h4 className="round-title">Round {round.roundNumber}</h4>
                            
                            {/* High bracket */}
                            <div className="bracket-level high">
                                <div className="bracket-level-title">High</div>
                                <div className="matches-container">
                                    {bracketMatches
                                        .filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'high')
                                        .map(match => (
                                            <div key={`match-high-${match.id}`}>
                                                {renderSwissMatch(match)}
                                            </div>
                                        ))}
                                    {bracketMatches.filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'high').length === 0 && (
                                        <div className="text-muted text-center small">No matches</div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Mid bracket (from round 2+) */}
                            {roundIndex >= 1 && (
                                <div className="bracket-level mid">
                                    <div className="bracket-level-title">Mid</div>
                                    <div className="matches-container">
                                        {bracketMatches
                                            .filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'mid')
                                            .map(match => (
                                                <div key={`match-mid-${match.id}`}>
                                                    {renderSwissMatch(match)}
                                                </div>
                                            ))}
                                        {bracketMatches.filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'mid').length === 0 && (
                                            <div className="text-muted text-center small">No matches</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Low bracket (from round 2+) */}
                            {roundIndex >= 1 && (
                                <div className="bracket-level low">
                                    <div className="bracket-level-title">Low</div>
                                    <div className="matches-container">
                                        {bracketMatches
                                            .filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'low')
                                            .map(match => (
                                                <div key={`match-low-${match.id}`}>
                                                    {renderSwissMatch(match)}
                                                </div>
                                            ))}
                                        {bracketMatches.filter(match => match.roundNumber === round.roundNumber && match.bracketLevel === 'low').length === 0 && (
                                            <div className="text-muted text-center small">No matches</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {/* Arrow paths would go here in a production implementation */}
            </div>
        );
    };
    
    // Render a match specifically for the Swiss bracket view
    const renderSwissMatch = (match: BracketMatch) => {
        const matchUrl = `${window.location.origin}/matches/search?ids=${match.id}`;
        
        // Get detailed match information to calculate match-specific stats
        const detailedMatch = matchesWithDetailedGames.get(match.id);
        const matchGames = detailedMatch?.games || [];
        
        // Calculate match-specific stats for player 1
        const player1MatchWins = matchGames.filter(g => g.winner_id === match.player1.id && g.status === "Complete").length;
        const player1MatchLosses = matchGames.filter(g => g.loser_id === match.player1.id && g.status === "Complete").length;
        const player1MatchDraws = matchGames.filter(g => g.draw && g.status === "Complete").length;
        
        // Calculate match-specific stats for player 2
        const player2MatchWins = matchGames.filter(g => g.winner_id === match.player2.id && g.status === "Complete").length;
        const player2MatchLosses = matchGames.filter(g => g.loser_id === match.player2.id && g.status === "Complete").length;
        const player2MatchDraws = matchGames.filter(g => g.draw && g.status === "Complete").length;
        
        return (
            <Card className="bracket-match" key={`match-${match.id}`}>
                {match.status === "Complete" && match.isDraw && (
                    <div className="draw-indicator">DRAW</div>
                )}
                <Card.Header 
                    className="clickable-header"
                    onClick={() => window.location.href = matchUrl}
                >
                    <div className="d-flex justify-content-between align-items-center">
                        <small>
                            Match {match.id}
                            {match.completedGames > 0 && 
                             <span className="ms-1 text-muted">
                                ({match.completedGames}/{match.numGames || 0})
                             </span>
                            }
                        </small>
                        <div className="d-flex align-items-center">
                            {/* Show elapsed timer for in-progress matches */}
                            {match.status === "In Progress" && match.startedAt && (
                                <div className="me-2">
                                    <Timer startTime={match.startedAt} />
                                </div>
                            )}
                            {/* Show static elapsed time for completed matches */}
                            {match.status === "Complete" && match.startedAt && match.endedAt && (
                                <div className="me-2">
                                    <Timer startTime={match.startedAt} endTime={match.endedAt} />
                                </div>
                            )}
                            <Badge bg={match.isDraw && match.status === "Complete" ? "warning" : match.status === "Complete" ? "success" : match.status === "In Progress" ? "primary" : "secondary"}>
                                {match.isDraw && match.status === "Complete" ? "Draw" : match.status}
                            </Badge>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body>
                    <div className={`player ${match.isDraw && match.status === "Complete" ? 'draw' : match.player1.isWinner ? 'winner' : ''}`}>
                        <span>
                            {match.player1.name}
                            <span className="player-stats" title="Match W-L-D record">
                                ({player1MatchWins}-{player1MatchLosses}-{player1MatchDraws})
                            </span>
                            <span className="player-stats overall-stats" title="Overall tournament W-L-D record">
                                T: ({match.player1.wins}-{match.player1.losses}-{match.player1.draws})
                            </span>
                            {match.player1.elo !== undefined && (
                                <ELOBadge elo={match.player1.elo} eloHistory={match.player1.elo_history} />
                            )}
                            {match.player1.qualified && (
                                <span className="player-status player-qualified">IN</span>
                            )}
                            {match.player1.eliminated && (
                                <span className="player-status player-eliminated">OUT</span>
                            )}
                        </span>
                        {match.status !== "Pending" && (
                            <span className="score">
                                {match.player1.score != null ? (match.player1.score % 1 === 0 ? match.player1.score : match.player1.score.toFixed(1)) : 0}
                            </span>
                        )}
                    </div>
                    <div className={`player ${match.isDraw && match.status === "Complete" ? 'draw' : match.player2.isWinner ? 'winner' : ''}`}>
                        <span>
                            {match.player2.name}
                            <span className="player-stats" title="Match W-L-D record">
                                ({player2MatchWins}-{player2MatchLosses}-{player2MatchDraws})
                            </span>
                            {match.player2.wins !== undefined && match.player2.losses !== undefined && match.player2.draws !== undefined && (
                                <span className="player-stats overall-stats" title="Overall tournament W-L-D record">
                                    T: ({match.player2.wins}-{match.player2.losses}-{match.player2.draws})
                                </span>
                            )}
                            {match.player2.elo !== undefined && (
                                <ELOBadge elo={match.player2.elo} eloHistory={match.player2.elo_history} />
                            )}
                            {match.player2.qualified && (
                                <span className="player-status player-qualified">IN</span>
                            )}
                            {match.player2.eliminated && (
                                <span className="player-status player-eliminated">OUT</span>
                            )}
                        </span>
                        {match.status !== "Pending" && (
                            <span className="score">
                                {match.player2.score != null ? (match.player2.score % 1 === 0 ? match.player2.score : match.player2.score.toFixed(1)) : 0}
                            </span>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    // Function to refresh tournament data
    const refreshTournamentData = async () => {
        if (!id) return;
        
        try {
            // Clear existing data first
            setMatchesWithDetailedGames(new Map());
            
            // Fetch fresh tournament data
            const response = await fetch(`${apiUrl}/tournaments?ids=${id}`, {mode:'cors'});
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data && data.length > 0) {
                console.log("Tournament data refreshed:", data[0]);
                setTournament(data[0]);
                
                // Get all match IDs
                const matchIds = data[0].matches.map((m: MatchesResult) => m.ID).join(',');
                
                // Get detailed match data that includes properly populated games
                if (matchIds) {
                    const matchResponse = await fetch(`${apiUrl}/matches?ids=${matchIds}`, {mode:'cors'});
                    if (!matchResponse.ok) {
                        throw new Error(`HTTP error! Status: ${matchResponse.status}`);
                    }
                    
                    const matchesData = await matchResponse.json();
                    
                    // Create a map of match ID to detailed match data
                    const detailedMatchesMap = new Map<number, MatchesResult>();
                    matchesData.forEach((match: MatchesResult) => {
                        detailedMatchesMap.set(match.ID, match);
                    });
                    
                    setMatchesWithDetailedGames(detailedMatchesMap);
                }
            } else {
                setError('Tournament not found');
            }
        } catch (err) {
            setError(`Failed to refresh tournament data: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    if (loading) {
        return (
            <Container className="mt-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">
                    {error}
                </Alert>
                <Link to="/tournaments/search">
                    <Button variant="primary">Back to Tournaments</Button>
                </Link>
            </Container>
        );
    }

    return (
        <Container className="mt-4 tournament-bracket-container">
            <div className="d-flex justify-content-between mb-3">
                <h2>
                    {tournament?.name || "Tournament"} Bracket
                    <Badge bg="info" className="ms-2">{tournament?.type}</Badge>
                    <Badge bg={tournament?.status === "Complete" ? "success" : tournament?.status === "In Progress" ? "primary" : "secondary"} className="ms-2">
                        {tournament?.status}
                    </Badge>
                </h2>
                <div>
                    <RefreshButton 
                        onRefresh={refreshTournamentData} 
                        className="me-2"
                    />
                    <Link to="/tournaments/search">
                        <Button variant="outline-secondary">Back to Tournaments</Button>
                    </Link>
                </div>
            </div>

            {tournament?.players.length === 0 ? (
                <Alert variant="warning">
                    This tournament has no players.
                </Alert>
            ) : bracketMatches.length === 0 ? (
                <Alert variant="info">
                    No matches have been created for this tournament yet.
                </Alert>
            ) : (
                <SwissBracketVisualizer />
            )}

            {tournament?.winner && (
                <Card className="mt-4 winner-card">
                    <Card.Header className="text-center">Tournament Winner</Card.Header>
                    <Card.Body className="text-center">
                        <h3>{tournament.winner.name}</h3>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
}

export default TournamentBracket;
