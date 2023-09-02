import { useState } from 'react';
import styles from './SearchGames.module.css';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';
import { pluck, prettyDate } from '../../../utils/utils';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaTv } from 'react-icons/fa6';
import moment from 'moment';

interface SearchGamesProps {
    tableData: any[]
    refreshData: Function
}

export function SearchGames({ tableData, refreshData }: SearchGamesProps): JSX.Element {
    const [data, setData] = useState(tableData);

    const visUrl = process.env.REACT_APP_VIS_URL;

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
                if (winner === null || winner?.ID === 0) {
                    return "Undetermined"
                } else {
                    return <a href={`${window.location.origin}/players/search?ids=${encodeURI(winner?.ID.toString())}`}>{winner?.name}</a>
                }
            }
        },
        {
            key: "loser",
            title: "Loser",
            width: 200,
            render: (_, { loser }) => {
                if (loser === null || loser?.ID === 0) {
                    return "Undetermined"
                } else {
                    return <a href={`${window.location.origin}/players/search?ids=${encodeURI(loser?.ID.toString())}`}>{loser?.name}</a>
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
                return (
                    <OverlayTrigger placement="top" overlay={renderDateTooltip(CreatedAt)}>
                        <span>{moment(CreatedAt.toString()).fromNow()}</span>
                    </OverlayTrigger>
                )
            }
        },
        {
            key: "visualize",
            title: "Visualize",
            width: 100,
            render: (_, { gamelog_url }) => {
                return (
                    <>
                        {gamelog_url !== undefined && gamelog_url !== "" &&
                            <Button variant="outline-info" href={`${visUrl}/?log=${encodeURI(gamelog_url)}`}>
                                <h4><FaTv /></h4>
                            </Button>
                        }
                    </>
                )
            }
        },
    ];

    const renderDateTooltip = (date: Date) => {
        return (
            <Tooltip id={`tooltip-date-${date}`} style={{position:"fixed"}}>
                {prettyDate(date.toString())}
            </Tooltip>
        )
    }

    return (
        <>
        <h3>Games</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
