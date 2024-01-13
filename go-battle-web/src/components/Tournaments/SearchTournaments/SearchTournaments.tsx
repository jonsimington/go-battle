import { useEffect, useState } from 'react';
import { Button, OverlayTrigger, Toast, Tooltip } from 'react-bootstrap';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { allPlayersHaveSameScore, delay, pluck, slugify } from '../../../utils/utils';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { PlayerScore } from '../../../models/PlayerScore';
import { FaCirclePlay, FaSpinner } from 'react-icons/fa6';
import TimeAgo from 'timeago-react';

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
    const [data, setData] = useState(tableData);
    const [sortType, setSortType] = useState("created-desc");
    const [tournamentsPlaying, setTournamentsPlaying] = useState<number[]>([]);
    const [tournamentStartTimes, setTournamentStartTimes] = useState<TournamentStartTime[]>([]);

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [alertText, setAlertText] = useState('');

    useEffect(() => {
        const sortData = (sortType: any) => {
            let sortedData = [...data] as TournamentsResult[];
    
            if(sortType === "created") {
                sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
            }
            else if(sortType === "created-desc") {
                sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
            }
    
            setData(sortedData);
        }

        sortData("created-desc");
    }, [sortType]);

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
        // TODO: can we extract this function since it's the same as in SearchMatches?
        {
            key: "players",
            title: "Players",
            width: 280,
            render: (_, { players, games, ID }) => {
                const playerIds = players.map(pluck('ID')).join(', ');
                const playerNames = players.map(pluck('name'));

                let playerScores: PlayerScore[] = [];

                playerNames.forEach(playerName => {
                    let playerWins = games.filter((g) => g.winner?.name === playerName).length;
                    let playerLosses = games.filter((g) => g.loser?.name === playerName).length;
                    let playerDraws = games.filter((g) => g.draw === true).length * 0.5
                    let playerID = players.filter((p) => p.name === playerName)[0].ID
                    let playerELO = players.filter((p) => p.name === playerName)[0].elo
                    playerScores.push({
                        name: playerName,
                        wins: playerWins,
                        losses: playerLosses,
                        draws: playerDraws,
                        id: playerID,
                        elo: playerELO
                    } as PlayerScore)
                });

                playerScores.sort((a, b) => a.wins < b.wins ? -1 : a.wins > b.wins ? 0 : 1)

                if(playerIds.length > 0) {
                    return (
                        <>
                            {playerScores.map((score) => {
                                let badgeColor = allPlayersHaveSameScore(playerScores) ? "outline-secondary" : playerScores[playerScores.length - 1]?.name === score.name ? "outline-success" : "outline-danger";
                                let badgeKey = `player-score-badge-${slugify(score.name)}-${ID}`;
                                let aKey = `player-score-a-${slugify(score.name)}-${ID}`;
                                let playersLink = `${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`;

                                return (
                                    <a href={playersLink} key={aKey}>
                                        <OverlayTrigger placement="top" overlay={renderPlayerRecordTooltip(score)}>
                                            <Button variant={badgeColor} size="sm" className="mx-1 my-1" key={badgeKey}>{score.name} ({score.elo}): {score.wins + score.draws}</Button>
                                        </OverlayTrigger>
                                    </a>
                                )
                            })}
                        </>
                    )
                }
                else {
                    return (
                        <span>No Players</span>
                    )
                }
            }
        },
        {
            key: "games",
            title: "Games",
            width: 100,
            render: (_, { games, ID }) => {
                const gameIds = games.map(pluck('ID')).join(', ');

                if(gameIds.length > 0) {
                    return (
                        <Button 
                            variant="outline-info" 
                            size="sm" 
                            key={`games-${ID}`}
                            href={`${window.location.origin}/games/search?ids=${encodeURI(gameIds)}`}>
                                {gameIds}
                        </Button>
                    )
                }
                else {
                    return (
                        <span>No Games Yet</span>
                    )
                }
            }
        },
        {
            key: "matches",
            title: "Matches",
            width: 100,
            render: (_, { matches, ID }) => {
                const matchIds = matches.map(pluck('ID')).join(', ');

                if(matches.length > 0) {
                    return (
                        <Button 
                            variant="outline-info" 
                            size="sm" 
                            key={`games-${ID}`}
                            href={`${window.location.origin}/games/search?ids=${encodeURI(matchIds)}`}>
                                {matchIds}
                        </Button>
                    )
                }
                else {
                    return (
                        <span>No Matches Yet</span>
                    )
                }
            }
        },
        {
            key: "winner",
            title: "Winner",
            width: 200,
            render: (_, { winner, ID }) => {
                if (winner === null || winner?.ID === 0) {
                    return "Undetermined"
                } else {
                    return (
                        <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="mx-1 my-1" 
                            key={`winner-${ID}`}
                            href={`${window.location.origin}/players/search?ids=${encodeURI(winner?.ID.toString())}`}>
                                {winner?.name}
                        </Button>
                    )
                }
            }
        },
        {
            key: "type",
            title: "Type",
            width: 150,
        },
        {
            key: "startTournament",
            title: "Start Tournament",
            width: 125,
            render: (_, { ID, status, start_time }) => {
                if(status === "Pending" && !tournamentsPlaying.includes(ID)) {
                    return (
                        <Button variant="outline-success" onClick={() => startTournament(ID)} key={`startTournamentButton-${ID}`}>
                            <h3><FaCirclePlay /></h3>
                        </Button>
                    )
                } else if(status === "In Progress" || tournamentsPlaying.includes(ID)) {
                    return (
                        <>
                            <div className="row d-inline-flex">
                                <Button variant="outline-info" key={`matchPlayingIcon-${ID}`} disabled={true}>
                                    <h3><FaSpinner  className="icon-spin" /></h3>
                                </Button>
                            </div>
                            <div className="row">
                                <TimeAgo datetime={start_time ?? new Date()} opts={{minInterval: 1}} className="mt-1" />
                            </div>
                        </>
                    )
                }
            }
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
        setTournamentsPlaying([...tournamentsPlaying, tournamentID]);
        setTournamentStartTimes([...tournamentStartTimes, {
            id: tournamentID,
            startTime: new Date(),
        }]);

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };

        const apiUrl = process.env.REACT_APP_API_URL;

        fetch(`${apiUrl}/tournaments/start?tournament_id=${tournamentID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(async () => {
                await delay(1000);
            })
            .then(() => {
                refreshData();
                setTournamentsPlaying(tournamentsPlaying.filter((mID) => mID !== tournamentID));
            });
    }

    const renderPlayerRecordTooltip = (player: PlayerScore) => {
        return (
            <Tooltip id={`tooltip-${slugify(player.name)}`} style={{position:"fixed"}}>
                Wins: {player.wins} | Losses: {player.losses} | Draws: {player.draws * 2}
            </Tooltip>
        )
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

            <DynamicTable data={data} columns={columns} />
        </>
    );
}
