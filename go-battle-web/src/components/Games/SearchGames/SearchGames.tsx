import { useEffect, useState } from 'react';
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

    useEffect(() => {
        sortData("created-desc")
    }, []);

    const sortData = (sortType: any) => {
        let sortedData = [...data] as GamesResult[];

        if(sortType === "created") {
            sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
        }
        else if(sortType === "created-desc") {
            sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
        }

        setData(sortedData);
    }

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
            render: (_, { players, ID }) => {
                const playerIds = players.map(pluck('ID')).join(', ');
    
                if(playerIds.length > 0) {
                    return (
                        <Button 
                            variant="outline-info" 
                            size="sm" 
                            key={`players-${ID}`}
                            href={`${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`}>
                                {playerIds}
                        </Button>
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
            render: (_, { winner, draw, ID }) => {
                if (draw) {
                    return "Draw"
                } else if (winner === null || winner?.ID === 0) {
                    return "Undetermined"
                } else {
                    return (
                        <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="mx-1 my-1 w-100" 
                            key={`winner-${ID}`}
                            href={`${window.location.origin}/players/search?ids=${encodeURI(winner?.ID.toString())}`}>
                                {winner?.name}
                        </Button>
                    )
                }
            }
        },
        {
            key: "loser",
            title: "Loser",
            width: 200,
            render: (_, { loser, draw, ID }) => {
                if (draw) {
                    return "Draw"
                } else if (loser === null || loser?.ID === 0) {
                    return "Undetermined"
                } else {
                    return (
                            <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="mx-1 my-1 w-100" 
                                key={`loser-${ID}`}
                                href={`${window.location.origin}/players/search?ids=${encodeURI(loser?.ID.toString())}`}>
                                    {loser?.name}
                            </Button>
                    )
                }
            }
        },
        {
            key: "match",
            title: "Match",
            width: 100,
            render: (_, { match }) => {
                return (
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        key={`match-${match.ID}`}
                        href={`${window.location.origin}/matches/search?ids=${encodeURI(match.ID.toString())}`}>
                            {match.ID}
                    </Button>
                )
            }
        },
        {
            key: "status",
            title: "Status",
            width: 100,
            render: (_, { status }) => {
                return (
                    status
                )
            }
        },
        {
            key: "CreatedAt",
            title: "Created",
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
                            <Button variant="outline-info" href={`${visUrl}/?log=${encodeURI(gamelog_url)}`} target='_'>
                                <h5><FaTv /></h5>
                            </Button>
                        }
                        {(gamelog_url === undefined || gamelog_url === "") &&
                            <Button variant="outline-secondary" disabled={true}>
                                <h5><FaTv /></h5>
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
        <DynamicTable data={tableData} columns={columns} />
        </>
    );
}
