import React, { FC } from 'react';
import styles from './SearchGames.module.css';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';

interface SearchGamesProps {
    tableData: any[]
}

const columns: IColumnType<GamesResult>[] = [
    {
        key: "ID",
        title: "ID",
        width: 200,
    },
    {
        key: "players",
        title: "Players",
        width: 200,
    },
    {
        key: "winner",
        title: "Winner",
        width: 200,
    },
    {
        key: "loser",
        title: "Loser",
        width: 200,
    },
    {
        key: "match",
        title: "Match ID",
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

export function SearchGames({ tableData }: SearchGamesProps): JSX.Element {
    let data: GamesResult[] = [];

    tableData.forEach((d) => {
        let game =  {
            ID: d['ID'],
            CreatedAt: d['CreatedAt'],
            UpdatedAt: d['UpdatedAt'],
            DeletedAt: d['DeletedAt'],
            loser: d['loser'],
            winner: d['winner'],
            match: d['match'],
        } as GamesResult;

        data.push(game);
    })

    return (
        <>
        <h3>Games</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
