import { useState } from 'react';
import styles from './SearchGames.module.css';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';
import { pluck, prettyDate } from '../../../utils/utils';
import { Button } from 'react-bootstrap';
import { FaTv } from 'react-icons/fa6';

interface SearchGamesProps {
    tableData: any[]
}

export function SearchGames({ tableData }: SearchGamesProps): JSX.Element {
    const [data, setData] = useState(tableData);

    const columns: IColumnType<GamesResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "players",
            title: "Players",
            width: 100,
            render: (_, { players }) => {
                const playerIds = players.map(pluck('ID')).join(', ');
    
                if(playerIds.length > 0) {
                    return (
                        <a href={`${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`}>{playerIds}</a>
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
            key: "winner",
            title: "Winner",
            width: 200,
            render: (_, { winner }) => {
                if (winner === 0) {
                    return "Undetermined"
                } else {
                    return <a href={`${window.location.origin}/players/search?ids=${encodeURI(winner.toString())}`}>{winner}</a>
                }
            }
        },
        {
            key: "loser",
            title: "Loser",
            width: 200,
            render: (_, { loser }) => {
                if (loser === 0) {
                    return "Undetermined"
                } else {
                    return <a href={`${window.location.origin}/players/search?ids=${encodeURI(loser.toString())}`}>{loser}</a>
                }
            }
        },
        {
            key: "match",
            title: "Match ID",
            width: 100,
            render: (_, { match }) => {
                return <a href={`${window.location.origin}/matches/search?ids=${encodeURI(match.ID.toString())}`}>{match.ID}</a>
            }
        },
        {
            key: "CreatedAt",
            title: "Created At",
            width: 200,
            render: (_, { CreatedAt }) => {
                return prettyDate(CreatedAt.toString())
            }
        },
        {
            key: "visualize",
            title: "Visualize",
            width: 100,
            render: (_, {  }) => {
                return (
                    <>
                        <Button variant="outline-info" href={""}>
                            <h4><FaTv /></h4>
                        </Button>
                    </>
                )
            }
        },
    ];

    return (
        <>
        <h3>Games</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
