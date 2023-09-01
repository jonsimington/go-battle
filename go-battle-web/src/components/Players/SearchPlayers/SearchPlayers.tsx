import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useState } from 'react';
import moment from 'moment';

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
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
        key: "client",
        title: "Client",
        width: 100,
        render: (_, { client }) => {
            return (
                <>
                    <a href={`${window.location.origin}/clients/search?ids=${client.ID}`}>{client.ID}</a>
                </>
            )
        }
    },
    {
        key: "CreatedAt",
        title: "Created At",
        width: 200,
        render: (_, { CreatedAt }) => {
            return moment(CreatedAt.toString()).fromNow();
        }
    },
];

export function SearchPlayers({ tableData, refreshData }: SearchPlayersProps): JSX.Element {
    const [data, setData] = useState(tableData);

    return (
        <>
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
