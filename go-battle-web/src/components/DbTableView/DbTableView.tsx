import React, { FC, useEffect, useState } from 'react';
import styles from './DbTableView.module.css';
import { FaSpinner } from "react-icons/fa6";
import { DynamicTable } from '../DynamicTable/DynamicTable';
import { Type } from 'typescript';
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';

interface DbTableViewProps<T> {
    context: string;
    // rowType: Type;
}

export function DbTableView<T>({ context }: DbTableViewProps<T>): JSX.Element {
    const [data, setData] = useState<unknown[]>();
    const [loading, setLoading] = useState(true);

    const tableTitle = context.charAt(0).toUpperCase() + context.substring(1);

    


    // fetch data from api TODO: config this urlBase
    useEffect(() => {
        fetch(`http://localhost:3000/${context}`, {mode:'cors'})
          .then(response => response.json())
          .then(json => {
            console.log(json);
            setData(json);
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
                </>
            )
            }
        </>
      );
}
