import { useEffect, useState } from 'react';
import styles from './DbTableView.module.css';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';
import { useSearchParams } from 'react-router-dom';
import { ApiResult } from '../../models/ApiResult';

interface DbTableViewProps<T> {
    context: string;
}

export function DbTableView<T>({ context }: DbTableViewProps<T>): JSX.Element {
    const [data, setData] = useState<ApiResult[]>();
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const apiUrl = process.env.REACT_APP_API_URL;

    // fetch data from api
    useEffect(() => {
        let url = `${apiUrl}/${context}`;
        let ids = searchParams.get("ids");

        if (ids != null) {
            url += `?ids=${encodeURI(ids)}`
        }

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: ApiResult[]) => {
            json.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
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
