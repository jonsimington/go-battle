import React, { FC } from 'react';
import styles from './SearchMatches.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { styled } from '@stitches/react';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay } from 'react-icons/fa6';
import { Button } from 'react-bootstrap';
import { PlayersResult } from '../../../models/PlayersResult';
import { pluck } from '../../../utils/utils';

interface SearchMatchesProps {
    tableData: any[]
}

const startMatch = (matchID: number) =>  {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    };

    const apiUrl = process.env.REACT_APP_API_URL;

    fetch(`${apiUrl}/matches/start?match_id=${matchID}`, requestOptions)
        .then(async response => {
            const responseText = await response.text();
            if (response.ok) {
            } else if (response.status === 400) {
            } else if (response.status === 500) {
            }
        })
}

const columns: IColumnType<MatchesResult>[] = [
    {
        key: "id",
        title: "ID",
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
        render: (_, { games }) => {
            const gameIds = games.map(pluck('id')).join(',');

            if(gameIds.length > 0) {
                return (
                    <a href={`${window.location.origin}/games/search?ids=${encodeURI(gameIds)}`}>{gameIds}</a>
                )
            }
            else {
                return (
                    <span>No Games Yet</span>
                )
            }
        }
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
        key: "CreatedAt",
        title: "Created At",
        width: 200,
    },
    {
        key: "status",
        title: "Status",
        width: 200,
    },
    {
        key: "startMatch",
        title: "Start Match",
        width: 200,
        render: (_, { id }) => {
            return (
                <>
                    <Button variant="outline-success" onClick={() => startMatch(id)}>
                        <h3><FaCirclePlay /></h3>
                    </Button>
                </>
            )
        }
    }
];

export function SearchMatches({ tableData }: SearchMatchesProps): JSX.Element {
    let data: MatchesResult[] = tableData;

    return (
        <>
        <h3>Matches</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
