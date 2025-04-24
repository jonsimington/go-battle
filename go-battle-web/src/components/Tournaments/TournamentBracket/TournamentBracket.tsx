import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { MatchesResult } from '../../../models/MatchesResult';
import { GamesResult } from '../../../models/GamesResult';
import { calculatePlayerScores } from '../../../utils/utils';
import './TournamentBracket.css';

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
}

interface BracketMatch {
    id: number;
    roundNumber: number;
    player1: MatchPlayer;
    player2: MatchPlayer;
    status: string;
    numGames: number;        // Total number of games in the match
    completedGames: number;  // Number of completed games
}

export function TournamentBracket(): JSX.Element {
    const { id } = useParams<{id: string}>();
    const [tournament, setTournament] = useState<TournamentsResult | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
    // Add state for detailed match data
    const [matchesWithDetailedGames, setMatchesWithDetailedGames] = useState<Map<number, MatchesResult>>(new Map());

    const apiUrl = process.env.REACT_APP_API_URL;

    // Modify the useEffect hook to properly handle data loading sequence
    useEffect(() => {
        if (id) {
            fetchTournament(parseInt(id));
        }
    }, [id]);
    
    // Add a new effect to organize tournament data only after match data is loaded
    useEffect(() => {
        if (tournament && matchesWithDetailedGames.size > 0) {
            console.log("Both tournament and detailed matches loaded, organizing data");
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
                console.log("Tournament data fetched:", data[0]);
                setTournament(data[0]);
                
                // Get all match IDs
                const matchIds = data[0].matches.map((m: MatchesResult) => m.ID).join(',');
                
                // Get detailed match data that includes properly populated games
                if (matchIds) {
                    fetchDetailedMatches(matchIds);
                }
                
                // We'll organize data in the useEffect after both data sources are loaded
            } else {
                setError('Tournament not found');
                setLoading(false);
            }
        } catch (err) {
            setError(`Failed to fetch tournament data: ${err instanceof Error ? err.message : String(err)}`);
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
            
            // Create a map of match ID to detailed match data
            const detailedMatchesMap = new Map<number, MatchesResult>();
            matchesData.forEach((match: MatchesResult) => {
                detailedMatchesMap.set(match.ID, match);
            });
            
            setMatchesWithDetailedGames(detailedMatchesMap);
            setLoading(false); // Move this here to ensure we're only done loading when both data sets are ready
        } catch (err) {
            console.error("Failed to fetch detailed match data:", err);
            setLoading(false);
        }
    };

    const organizeTournamentData = (tournament: TournamentsResult) => {
        // Group matches by round (based on creation time or based on match metadata if available)
        const sortedMatches = [...tournament.matches].sort((a, b) => 
            new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
        );
        
        // Group matches into rounds based on Swiss tournament format
        const numPlayers = tournament.players.length;
        const matchesPerRound = Math.floor(numPlayers / 2);
        const estimatedNumRounds = Math.ceil(Math.log2(numPlayers)); // Typical number of rounds in Swiss format
        
        const organizedRounds: Round[] = [];
        let bracketMatchesArray: BracketMatch[] = [];
        
        // If we have enough matches, try to organize them by rounds
        if (sortedMatches.length > 0) {
            for (let i = 0; i < estimatedNumRounds; i++) {
                const startIdx = i * matchesPerRound;
                const endIdx = Math.min(startIdx + matchesPerRound, sortedMatches.length);
                
                if (startIdx < sortedMatches.length) {
                    const roundMatches = sortedMatches.slice(startIdx, endIdx);
                    organizedRounds.push({
                        roundNumber: i + 1,
                        matches: roundMatches
                    });
                    
                    // Convert to bracket match format
                    roundMatches.forEach(match => {
                        if (!match.players || match.players.length === 0) return;
                        
                        const player1 = match.players[0];
                        const player2 = match.players.length > 1 ? match.players[1] : null;
                        
                        // Get the detailed match data with properly populated games
                        const detailedMatch = matchesWithDetailedGames.get(match.ID);
                        
                        // Calculate player scores using detailed match data if available
                        let player1Score = 0; 
                        let player2Score = 0;
                        let player1IsWinner = false;
                        let player2IsWinner = false;
                        let completedGames = 0;
                        
                        if (detailedMatch && detailedMatch.games) {
                            // Calculate scores based on winner_id and loser_id instead of winner and loser objects
                            completedGames = detailedMatch.games.filter(g => g.status === "Complete").length;
                            
                            // Count wins for each player
                            detailedMatch.games.forEach(game => {
                                if (game.status !== "Complete") return;
                                
                                // Handle draws
                                if (game.draw) {
                                    player1Score += 0.5;
                                    player2Score += 0.5;
                                    return;
                                }
                                
                                // Use winner_id and loser_id since winner/loser objects are null
                                if (game.winner_id === player1.ID) {
                                    player1Score += 1;
                                } else if (player2 && game.winner_id === player2.ID) {
                                    player2Score += 1;
                                }
                            });
                            
                            // Determine winners based on score comparison only if match is complete
                            if (match.status === "Complete") {
                                // Check if player1 has more wins than player2
                                if (player1Score > player2Score) {
                                    player1IsWinner = true;
                                    player2IsWinner = false;
                                } else if (player2 && player2Score > player1Score) {
                                    player1IsWinner = false;
                                    player2IsWinner = true;
                                } else {
                                    // It's a draw, neither player is highlighted
                                    player1IsWinner = false;
                                    player2IsWinner = false;
                                }
                            }
                            
                            console.log(`Match ${match.ID} scores and winners:`, {
                                player1: player1.name,
                                player1Score,
                                player1IsWinner,
                                player2: player2?.name,
                                player2Score,
                                player2IsWinner,
                                status: match.status
                            });
                        } else {
                            completedGames = match.games.filter(g => g.status === "Complete").length;
                        }

                        bracketMatchesArray.push({
                            id: match.ID,
                            roundNumber: i + 1,
                            player1: {
                                id: player1.ID,
                                name: player1.name,
                                score: player1Score,
                                isWinner: player1IsWinner
                            },
                            player2: player2 ? {
                                id: player2.ID, 
                                name: player2.name,
                                score: player2Score,
                                isWinner: player2IsWinner
                            } : {
                                id: 0,
                                name: 'Bye',
                                score: 0,
                                isWinner: false
                            },
                            status: match.status,
                            numGames: match.numGames,
                            completedGames: completedGames
                        });
                    });
                }
            }
        }
        
        setRounds(organizedRounds);
        setBracketMatches(bracketMatchesArray);
    };

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
                <Link to="/tournaments/search">
                    <Button variant="outline-secondary">Back to Tournaments</Button>
                </Link>
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
                <div className="bracket-container">
                    {rounds.map((round, roundIndex) => (
                        <div className="bracket-round" key={`round-${round.roundNumber}`}>
                            <h4 className="round-title">Round {round.roundNumber}</h4>
                            <div className="matches-container">
                                {bracketMatches
                                    .filter(match => match.roundNumber === round.roundNumber)
                                    .map(match => renderMatch(match))}
                            </div>
                        </div>
                    ))}
                </div>
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
