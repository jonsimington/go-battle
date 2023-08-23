import { useEffect, useState } from 'react';
import styles from './DbTableView.module.css';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';

interface DbTableViewProps<T> {
    context: string;
}

export function DbTableView<T>({ context }: DbTableViewProps<T>): JSX.Element {
    const [data, setData] = useState<unknown[]>();
    const [loading, setLoading] = useState(true);

    const apiUrl = process.env.REACT_APP_API_URL;

    // fetch data from api TODO: config this urlBase
    useEffect(() => {
        fetch(`${apiUrl}/${context}`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            setData(json)
          })
          .catch(error => console.error(error))
          .finally(() => setLoading(false));
      }, []);

    return (
        <>
            {loading ? (
                <h3><FaSpinner className="icon-spin"></FaSpinner></h3>
            ) : (
                <>
                {context == "players" &&
                    <SearchPlayers tableData={data ?? []}></SearchPlayers>
                }
                {context == "games" &&
                    <SearchGames tableData={data ?? []}></SearchGames>
                }
                {context == "matches" &&
                    <SearchMatches tableData={data ?? []}></SearchMatches>
                }
                {context == "clients" &&
                    <SearchClients tableData={data ?? []}></SearchClients>
                }
                </>
            )
            }
        </>
      );
}
