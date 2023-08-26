import React, { FC } from 'react';
import styles from './SearchGames.module.css';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { GamesResult } from '../../../models/GamesResult';
import { pluck } from '../../../utils/utils';

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
        render: (_, { players }) => {
            const playerIds = players.map(pluck('id')).join(',');

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
            return <a href={`${window.location.origin}/players/search?ids=${encodeURI(winner.toString())}`}>{winner}</a>
        }
    },
    {
        key: "loser",
        title: "Loser",
        width: 200,
        render: (_, { loser }) => {
            return <a href={`${window.location.origin}/players/search?ids=${encodeURI(loser.toString())}`}>{loser}</a>
        }
    },
    {
        key: "match",
        title: "Match ID",
        width: 200,
        render: (_, { match }) => {
            return <a href={`${window.location.origin}/matches/search?ids=${encodeURI(match.id.toString())}`}>{match.id}</a>
        }
    },
    {
        key: "CreatedAt",
        title: "Created At",
        width: 200,
    },
];

export function SearchGames({ tableData }: SearchGamesProps): JSX.Element {
    let data: GamesResult[] = tableData;

    return (
        <>
        <h3>Games</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
