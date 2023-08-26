import styles from './SearchPlayers.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
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
        key: "client_id",
        title: "Client",
        width: 200,
        render: (_, { client_id }) => {
            return (
                <>
                    <a href={`${window.location.origin}/clients/search?ids=${client_id}`}>{client_id}</a>
                </>
            )
        }
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
    let data: PlayersResult[] = tableData;

    return (
        <>
        <h3>Players</h3>
        <DynamicTable data={data} columns={columns} />
        </>
    );
}
