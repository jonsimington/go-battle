import { useState } from 'react';
import styles from './SearchClients.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { ClientsResult } from '../../../models/ClientsResult';
import moment from 'moment';

interface SearchClientsProps {
    tableData: any[]
    refreshData: Function
}

const columns: IColumnType<ClientsResult>[] = [
    {
        key: "ID",
        title: "ID",
        width: 50,
    },
    {
        key: "repo",
        title: "Repo",
        render: (_, { repo }) => {
            return (
                <>
                    <a href={repo}>{repo}</a>
                </>
            )
        }
    },
    {
        key: "language",
        title: "Language",
        width: 100,
    },
    {
        key: "game",
        title: "Game",
        width: 100,
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

export function SearchClients({ tableData, refreshData }: SearchClientsProps): JSX.Element {
    const [data, setData] = useState(tableData);

    return (
        <>
        <h3>Clients</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
