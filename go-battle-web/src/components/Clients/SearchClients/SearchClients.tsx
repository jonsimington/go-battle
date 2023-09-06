import { useState } from 'react';
import styles from './SearchClients.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { ClientsResult } from '../../../models/ClientsResult';
import moment from 'moment';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { prettyDate } from '../../../utils/utils';
import { FaChessBishop, FaPython, FaJs } from 'react-icons/fa6';
import { SiCplusplus } from 'react-icons/si'

interface SearchClientsProps {
    tableData: any[]
    refreshData: Function
}

export function SearchClients({ tableData, refreshData }: SearchClientsProps): JSX.Element {
    const [data, setData] = useState(tableData);

    const columns: IColumnType<ClientsResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "repo",
            title: "Repo",
            render: (_, { repo, ID }) => {
                return (
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        key={`repo-${ID}`}
                        href={repo}>
                            {repo}
                    </Button>
                )
            }
        },
        {
            key: "language",
            title: "Language",
            width: 100,
            render: (_, { language }) => {

                switch(language) {
                    case "py":
                        return (<FaPython></FaPython>)
                    case "js":
                        return (<FaJs></FaJs>)
                    case "cpp":
                        return (<SiCplusplus></SiCplusplus>)
                    default:
                        return "Unknown Language"
                }
            }
        },
        {
            key: "game",
            title: "Game",
            width: 100,
            render: (_, { game }) => {
                if (game === "chess") {
                    return <FaChessBishop />
                } else {
                    return game
                }
            }
        },
        {
            key: "CreatedAt",
            title: "Created",
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
        <h3>Clients</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
