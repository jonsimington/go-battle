import React, { FC } from 'react';
import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { styled } from '@stitches/react';
import { PlayersResult } from '../../../models/PlayersResult';

interface SearchPlayersProps {
    tableData: any[]
}

const columns: IColumnType<PlayersResult>[] = [
    {
        key: "id",
        title: "ID",
        width: 200,
    },
    {
        key: "name",
        title: "Name",
        width: 200,
    },
    {
        key: "ClientID",
        title: "Client ID",
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

export function SearchPlayers({ tableData }: SearchPlayersProps): JSX.Element {
    let data: PlayersResult[] = [];

    tableData.forEach((d) => {
        let player =  {
            id: d['id'],
            CreatedAt: d['CreatedAt'],
            UpdatedAt: d['UpdatedAt'],
            DeletedAt: d['DeletedAt'],
            name: d['name'],
            ClientID: d['ClientID'],
        } as PlayersResult;

        data.push(player);
    })

    return (
        <>
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
