import { useEffect, useState } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { allPlayersHaveSameScore, pluck, slugify } from '../../../utils/utils';
import { TournamentsResult } from '../../../models/TournamentsResult';
import { PlayerScore } from '../../../models/PlayerScore';

interface SearchTournamentsProps {
    tableData: any[]
    refreshData: Function
}

export function SearchTournaments({ tableData, refreshData }: SearchTournamentsProps): JSX.Element {
    const [data, setData] = useState(tableData);

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

        sortData("created-desc")
    }, [data]);

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
    ];

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
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
