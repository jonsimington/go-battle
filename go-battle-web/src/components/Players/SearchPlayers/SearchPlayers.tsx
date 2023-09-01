import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useState } from 'react';
import moment from 'moment';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { prettyDate } from '../../../utils/utils';

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
}

export function SearchPlayers({ tableData, refreshData }: SearchPlayersProps): JSX.Element {
    const [data, setData] = useState(tableData);

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
                return (
                    <OverlayTrigger placement="top" overlay={renderDateTooltip(CreatedAt)}>
                        <span>{moment(CreatedAt.toString()).fromNow()}</span>
                    </OverlayTrigger>
                )
            }
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
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
