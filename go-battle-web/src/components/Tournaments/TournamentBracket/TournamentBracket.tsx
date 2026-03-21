import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { MatchesResult } from '../../../models/MatchesResult';
import './TournamentBracket.css';
import { PlayersResult } from '../../../models/PlayersResult';
import moment from 'moment';
import { Timer } from '../../Common/Timer';
import ELOBadge from '../../Common/ELO';
import { getApiUrl } from '../../../utils/utils';
import { RefreshButton } from '../../Common';
import { HistoricalElo } from '../../../models/HistoricalElo';
import { FaTrophy, FaMedal } from 'react-icons/fa';

interface TournamentBracketProps {}

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
            
            const data = await response.json();
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

    // New component for Swiss tournament visualization
    const SwissTournamentVisualizer = () => {
        return (
            <div className="swiss-tournament-container">
                {rounds.map((round, roundIndex) => (
                    <div className="swiss-round" key={`round-${round.roundNumber}`}>
                        <h4 className="round-title">Round {round.roundNumber}</h4>
                        <div className="matches-container">
                            {bracketMatches
                                .filter(match => match.roundNumber === round.roundNumber)
                                .sort((a, b) => {
                                    // Sort by total score of players to show top matches first
                                    const aScore = (a.player1.wins || 0) + (a.player2.wins || 0);
                                    const bScore = (b.player1.wins || 0) + (b.player2.wins || 0);
                                    return bScore - aScore;
                                })
                                .map(match => (
                                    <div key={`match-${match.id}`}>
                                        {renderSwissMatch(match)}
                                    </div>
                                ))}
                            {bracketMatches.filter(match => match.roundNumber === round.roundNumber).length === 0 && (
                                <div className="text-muted text-center small">No matches</div>
                            )}
                        </div>
                    </div>
                ))}
                
                {/* Display current standings */}
                <div className="tournament-standings mt-4">
                    <h4>Current Standings</h4>
                    <div className="standings-container">
                        {Array.from(bracketMatches
                            .reduce((standings, match) => {
                                // Only count completed matches
                                if (match.status === "Complete") {
                                    // Update player 1 stats
                                    const player1 = standings.get(match.player1.id) || {
                                        id: match.player1.id,
                                        name: match.player1.name,
                                        wins: 0,
                                        losses: 0,
                                        draws: 0,
                                        score: 0
                                    };
                                    // Update player 2 stats
                                    const player2 = standings.get(match.player2.id) || {
                                        id: match.player2.id,
                                        name: match.player2.name,
                                        wins: 0,
                                        losses: 0,
                                        draws: 0,
                                        score: 0
                                    };

                                    // Get detailed match data
                                    const detailedMatch = matchesWithDetailedGames.get(match.id);
                                    const games = detailedMatch?.games || [];
                                    
                                    // Count games
                                    games.filter(g => g.status === "Complete").forEach(game => {
                                        if (game.draw) {
                                            player1.draws++;
                                            player2.draws++;
                                        } else if (game.winner_id === player1.id) {
                                            player1.wins++;
                                            player2.losses++;
                                        } else if (game.winner_id === player2.id) {
                                            player2.wins++;
                                            player1.losses++;
                                        }
                                    });

                                    // Update scores
                                    player1.score = player1.wins + (player1.draws * 0.5);
                                    player2.score = player2.wins + (player2.draws * 0.5);

                                    standings.set(player1.id, player1);
                                    standings.set(player2.id, player2);
                                }
                                return standings;
                            }, new Map<number, PlayerStatus>())
                            .values())
                            .sort((a, b) => b.score - a.score)
                            .map((player: PlayerStatus, index: number) => (
                                <div key={`standing-${player.id}`} className="player-standing">
                                    <span className="player-name">
                                        {index === 0 && <FaTrophy className="text-warning me-2" title="1st Place" />}
                                        {index === 1 && <FaMedal className="text-light me-2" title="2nd Place" />}
                                        {index === 2 && <FaMedal className="text-bronze me-2" title="3rd Place" style={{color: '#f78166'}} />}
                                        {player.name}
                                    </span>
                                    <div className="player-score">
                                        <span className="score-value">{player.score.toFixed(1)}</span>
                                        <span className="score-details">
                                            {player.wins}-{player.losses}-{player.draws}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    };

    // Render a match specifically for the Swiss tournament visualization
    const renderSwissMatch = (match: BracketMatch) => {
        const matchUrl = `${window.location.origin}/matches/search?ids=${match.id}`;
        
        // Get match-specific stats for players
        const detailedMatch = matchesWithDetailedGames.get(match.id);
        const matchGames = detailedMatch?.games || [];
        
        // Calculate match-specific stats for player 1
        const player1MatchWins = matchGames.filter(g => g.winner_id === match.player1.id && g.status === "Complete").length;
        const player1MatchLosses = matchGames.filter(g => g.loser_id === match.player1.id && g.status === "Complete").length;
        const player1MatchDraws = matchGames.filter(g => g.draw && g.status === "Complete").length;
        
        // Calculate match-specific stats for player 2 if not a bye
        const player2MatchWins = match.player2.id !== 0 ? matchGames.filter(g => g.winner_id === match.player2.id && g.status === "Complete").length : 0;
        const player2MatchLosses = match.player2.id !== 0 ? matchGames.filter(g => g.loser_id === match.player2.id && g.status === "Complete").length : 0;
        const player2MatchDraws = match.player2.id !== 0 ? matchGames.filter(g => g.draw && g.status === "Complete").length : 0;

        const player1FullStats = `Overall Record: ${match.player1.wins}-${match.player1.losses}-${match.player1.draws}`;
        const player2FullStats = match.player2.id !== 0 ? `Overall Record: ${match.player2.wins}-${match.player2.losses}-${match.player2.draws}` : 'Bye';
        
        const isByeMatch = match.player2.id === 0;
        
        return (
            <Card className="bracket-match">
                <Card.Header 
                    className="clickable-header"
                    onClick={() => window.location.href = matchUrl}
                >
                    <div className="d-flex justify-content-between align-items-center">
                        <small>
                            Match {match.id}
                            {!isByeMatch && match.completedGames > 0 && 
                             <span className="ms-1 text-muted">
                                ({match.completedGames}/{match.numGames || 0} games)
                             </span>
                            }
                        </small>
                        <div className="d-flex align-items-center">
                            {/* Show elapsed timer for in-progress matches */}
                            {!isByeMatch && match.status === "In Progress" && match.startedAt && (
                                <div className="me-2">
                                    <Timer startTime={match.startedAt} />
                                </div>
                            )}
                            {/* Show static elapsed time for completed matches */}
                            {!isByeMatch && match.status === "Complete" && match.startedAt && match.endedAt && (
                                <div className="me-2">
                                    <Timer startTime={match.startedAt} endTime={match.endedAt} />
                                </div>
                            )}
                            {isByeMatch ? (
                                <Badge bg="warning">Bye</Badge>
                            ) : (
                                <Badge bg={match.isDraw && match.status === "Complete" ? "warning" : match.status === "Complete" ? "success" : match.status === "In Progress" ? "primary" : "secondary"}>
                                    {match.isDraw && match.status === "Complete" ? "Draw" : match.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </Card.Header>
                <Card.Body>
                    <div className={`player ${
                        !isByeMatch ? (
                            match.status === "Complete" 
                                ? (match.isDraw ? 'draw' : match.player1.isWinner ? 'winner' : '')
                                : match.status === "In Progress" && match.player1.score != null && match.player2.score != null && match.player1.score > match.player2.score
                                    ? 'projected-winner'
                                    : ''
                        ) : 'winner'
                    }`}>
                        <div className="player-info">
                            <div className="player-name">{match.player1.name}</div>
                            <div className="player-stats-row">
                                <span className="player-stats" title={player1FullStats}>
                                    ({player1MatchWins}-{player1MatchLosses}-{player1MatchDraws})
                                </span>
                                {match.player1.elo !== undefined && (
                                    <ELOBadge elo={match.player1.elo} eloHistory={match.player1.elo_history} />
                                )}
                            </div>
                        </div>
                        {match.status !== "Pending" && (
                            <span className="score">
                                {match.player1.score != null ? match.player1.score.toFixed(1) : '0.0'}
                            </span>
                        )}
                    </div>
                    <div className={`player ${
                        isByeMatch ? 'bye' : (
                            match.status === "Complete"
                                ? (match.isDraw ? 'draw' : match.player2.isWinner ? 'winner' : '')
                                : match.status === "In Progress" && match.player1.score != null && match.player2.score != null && match.player2.score > match.player1.score
                                    ? 'projected-winner'
                                    : ''
                        )
                    }`}>
                        <div className="player-info">
                            <div className="player-name">{match.player2.name}</div>
                            {!isByeMatch && (
                                <div className="player-stats-row">
                                    <span className="player-stats" title={player2FullStats}>
                                        ({player2MatchWins}-{player2MatchLosses}-{player2MatchDraws})
                                    </span>
                                    {match.player2.elo !== undefined && (
                                        <ELOBadge elo={match.player2.elo} eloHistory={match.player2.elo_history} />
                                    )}
                                </div>
                            )}
                        </div>
                        {!isByeMatch && match.status !== "Pending" && (
                            <span className="score">
                                {match.player2.score != null ? match.player2.score.toFixed(1) : '0.0'}
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
                <SwissTournamentVisualizer />
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
