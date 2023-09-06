import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { pluck } from '../../../utils/utils';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
}

export function SearchPlayers({ tableData, refreshData }: SearchPlayersProps): JSX.Element {
    const [data, setData] = useState(tableData);

    useEffect(() => {
        sortData("elo-desc")
    }, []);

    const sortData = (sortType: any) => {
        let sortedData = [...data] as PlayersResult[];

        if(sortType === "created") {
            sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
        }
        else if(sortType === "created-desc") {
            sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
        }
        else if(sortType === "elo-desc") {
            sortedData.sort((a, b) => a.elo > b.elo ? -1 : a.elo < b.elo ? 1 : 0)
        }

        setData(sortedData);
    }

    const columns: IColumnType<PlayersResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "name",
            title: "Name",
            render: (_, { name, ID }) => {
                return (
                    <div className="d-flex-inline">
                        <Button 
                            className="text-light"
                            variant={`outline-secondary`} 
                            size="sm" 
                            key={`player-games-link-${ID}`}
                            disabled>
                                {name}
                        </Button>
                        <div className="float-end">
                            <Button 
                                href={`${window.location.origin}/games/search?players=${ID}`} 
                                variant={`outline-info`} 
                                size="sm" 
                                key={`player-games-link-${ID}`}>
                                    Games
                            </Button>
                            <Button 
                                className="ms-2"
                                href={`${window.location.origin}/matches/search?players=${ID}`} 
                                variant={`outline-info`} 
                                size="sm" 
                                key={`player-matches-link-${ID}`}>
                                    Matches
                            </Button>
                        </div>
                    </div>
                )
            }
        },
        {
            key: "elo",
            title: "ELO",
            width: 100,
            render: (_, { elo, ID }) => {
                let buttonVariant = "danger";

                if (elo >= 2200) {
                    buttonVariant = "success";
                }
                else if (elo >= 1850 && elo <= 2199) {
                    buttonVariant = "success"
                }
                else if (elo >= 1500 && elo <= 1849) {
                    buttonVariant = "secondary"
                }
                else if (elo >= 1200 && elo <= 1499) {
                    buttonVariant = "warning"
                }

                return (
                    <Button 
                        variant={`outline-${buttonVariant}`} 
                        size="sm" 
                        key={`elo-${ID}`}
                        disabled={true}>
                            {elo}
                    </Button>
                )
            }
        },
        {
            key: "elo_history",
            title: "ELO History",
            render: (_, { elo_history }) => {
                if (elo_history.length === 0) {
                    return "No History Yet";
                }
                else if (elo_history.length < 3) {
                    return "Not Enough History"
                }
                else {
                    let sortedHistory = elo_history.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 0 : 1);
                    let sortedElos = sortedHistory.map(pluck('elo'));

                    let sparklineColor = "#dc3545"; // danger

                    let firstElo = sortedElos[0];
                    let lastElo = sortedElos[sortedElos.length - 1];
    
                    if (firstElo < lastElo) {
                        sparklineColor = "#28a745"; // success
                    }

                    return (
                        <Sparklines data={sortedElos} width={100} height={25} margin={5}>
                            <SparklinesLine color={sparklineColor} style={{ strokeWidth: 0.5 }} />
                            <SparklinesSpots size={1} style={{ fill: sparklineColor }} />
                        </Sparklines>
                    )
                }

            }
        },
        {
            key: "client",
            title: "Client",
            width: 100,
            render: (_, { client }) => {
                return (
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        key={`client-${client.ID}`}
                        href={`${window.location.origin}/clients/search?ids=${client.ID}`}>
                            {client.ID}
                    </Button>
                )
            }
        }
    ];

    return (
        <>
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
