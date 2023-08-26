import React, { FC } from 'react';
import styles from './SearchClients.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { styled } from '@stitches/react';
import { ClientsResult } from '../../../models/ClientsResult';

interface SearchClientsProps {
    tableData: any[]
}

const columns: IColumnType<ClientsResult>[] = [
    {
        key: "ID",
        title: "ID",
        width: 200,
    },
    {
        key: "repo",
        title: "Repo",
        width: 200,
    },
    {
        key: "language",
        title: "Language",
        width: 200,
    },
    {
        key: "game",
        title: "Game",
        width: 200,
    },
    {
        key: "CreatedAt",
        title: "Created At",
        width: 200,
    },
    {
        key: "UpdatedAt",
        title: "Updated At",
        width: 200,
    }
];

export function SearchClients({ tableData }: SearchClientsProps): JSX.Element {
    let data: ClientsResult[] = tableData;

    return (
        <>
        <h3>Clients</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
