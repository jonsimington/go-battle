import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { prettyDate } from '../../../utils/utils';

interface SearchPlayersProps {
    tableData: any[]
}

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
            return prettyDate(CreatedAt.toString())
        }
    },
];

export function SearchPlayers({ tableData }: SearchPlayersProps): JSX.Element {
    let data: PlayersResult[] = tableData;

    return (
        <>
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
