import { useEffect, useState } from 'react';
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

    useEffect(() => {
        const sortData = (sortType: any) => {
            let sortedData = [...data] as ClientsResult[];
    
            if(sortType === "created") {
                sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
            }
            else if(sortType === "created-desc") {
                sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
            }
    
            setData(sortedData);
        }

        sortData("created")
    }, [data]);

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
                        return (<h4><FaPython></FaPython></h4>)
                    case "js":
                        return (<h4><FaJs></FaJs></h4>)
                    case "cpp":
                        return (<h4><SiCplusplus></SiCplusplus></h4>)
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
                    return <h4><FaChessBishop /></h4>
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
