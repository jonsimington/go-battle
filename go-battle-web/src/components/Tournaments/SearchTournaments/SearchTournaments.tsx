import React, { FC, useState } from 'react';
import styles from './SearchTournaments.module.css';
import { Tooltip } from 'react-bootstrap';
import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { prettyDate } from '../../../utils/utils';
import { PlayersResult } from '../../../models/PlayersResult';

interface SearchTournamentsProps {
    tableData: any[]
    refreshData: Function
}

export function SearchTournaments({ tableData, refreshData }: SearchTournamentsProps): JSX.Element {
    const [data, setData] = useState(tableData);

    const columns: IColumnType<PlayersResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
    ];

    const renderDateTooltip = (date: Date) => {
        return (
            <Tooltip id={`tooltip-date-${date}`} style={{position:"fixed"}}>
                {prettyDate(date.toString())}
            </Tooltip>
        )
    }

    return (
        <>
        <h3>Tournaments</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
