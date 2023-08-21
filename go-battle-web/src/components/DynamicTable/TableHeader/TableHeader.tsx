import React, { FC } from 'react';
import styles from './TableHeader.module.css';
import { styled } from "@stitches/react";
import { IColumnType } from "../DynamicTable";

interface TableHeaderProps<T> {
    columns: IColumnType<T>[];
}

const TableHeaderCell = styled("th", {
    backgroundColor: "#f1f1f1",
    padding: 12,
    fontWeight: 500,
    textAlign: "left",
    fontSize: 14,
    color: "#2c3e50",
    "&:first-child": {
        borderTopLeftRadius: 12,
    },
    "&:last-child": {
        borderTopRightRadius: 12,
    },
});

export function TableHeader<T>({ columns }: TableHeaderProps<T>): JSX.Element {
    return (
        <tr>
        {columns.map((column, columnIndex) => (
            <TableHeaderCell
            key={`table-head-cell-${columnIndex}`}
            style={{ width: column.width }}
            >
            {column.title}
            </TableHeaderCell>
        ))}
        </tr>
    );
}