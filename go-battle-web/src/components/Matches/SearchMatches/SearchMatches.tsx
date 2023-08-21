import React, { FC } from 'react';
import styles from './SearchMatches.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { styled } from '@stitches/react';
import { MatchesResult } from '../../../models/MatchesResult';

interface SearchMatchesProps {
    tableData: any[]
}

const columns: IColumnType<MatchesResult>[] = [
    {
        key: "ID",
        title: "ID",
        width: 200,
    },
    {
        key: "id",
        title: "\"ID\"",
        width: 200,
    },
    {
        key: "numGames",
        title: "# Games",
        width: 200,
    },
    {
        key: "games",
        title: "Games",
        width: 200,
    },
    {
        key: "players",
        title: "Players",
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

export function SearchMatches({ tableData }: SearchMatchesProps): JSX.Element {
    let data: MatchesResult[] = [];

    tableData.forEach((d) => {
        let match =  {
            ID: d['ID'],
            id: d['id'],
            CreatedAt: d['CreatedAt'],
            UpdatedAt: d['UpdatedAt'],
            DeletedAt: d['DeletedAt'],
            games: d['games'],
            numGames: d['numGames'],
            players: d['players']
        } as MatchesResult;

        data.push(match);
    })

    return (
        <>
        <h3>Matches</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
