import React, { FC } from 'react';
import styles from './TableRow.module.css';
import { styled } from "@stitches/react";

import { IColumnType } from "../DynamicTable";
import { TableRowCell } from './TableRowCell/TableRowCell';

interface TableRowProps<T> {
    data: T[];
    columns: IColumnType<T>[];
}

const TableRowItem = styled("tr", {
    cursor: "auto",
    "&:nth-child(odd)": {
        backgroundColor: "#f9f9f9",
    },
    "&:last-child": {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
});

export function TableRow<T>({ data, columns }: TableRowProps<T>): JSX.Element {
    return (
        <>
        {data.map((item, itemIndex) => (
            <TableRowItem key={`table-body-${itemIndex}`}>
            {columns.map((column, columnIndex) => (
                <TableRowCell
                key={`table-row-cell-${columnIndex}`}
                item={item}
                column={column}
                />
            ))}
            </TableRowItem>
        ))}
        </>
    );
}
