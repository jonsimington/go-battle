import React, { FC, useEffect, useState } from 'react';
import styles from './DynamicTable.module.css';
import { styled } from "@stitches/react";
import { TableHeader } from './TableHeader/TableHeader';
import { TableRow } from './TableRow/TableRow';

interface DynamicTableProps<T> {
    data: T[]
    columns: IColumnType<T>[];
}

export interface IColumnType<T> {
    key: string;
    title: string;
    width?: number;
    render?: (column: IColumnType<T>, item: T) => void;
  }

const TableWrapper = styled("table", {
    borderCollapse: "collapse",
    border: "none",
});

export function DynamicTable<T>({ data, columns }: DynamicTableProps<T>): JSX.Element {
    // const [columns, setColumns] = useState([])
    // const [rows, setRows] = useState([])

    // const headers = Object.keys(Object.values(props.data)[0])

    // console.log(typeof(props.data))
    // console.log(`dynamic table props: ${JSON.stringify(props.data)}`)


    return (
        <TableWrapper>
            <thead>
                <TableHeader columns={columns} />
            </thead>
            <tbody>
                <TableRow data={data} columns={columns} />
            </tbody>
        </TableWrapper>
      );
}


// export const DynamicTable: FC<DynamicTableProps<T>> = (props) => {
    
// }
