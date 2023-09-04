import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';

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
        },
        {
            key: "elo",
            title: "ELO",
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
                        key={`elo-${ID}`}>
                            {elo}
                    </Button>
                )
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
