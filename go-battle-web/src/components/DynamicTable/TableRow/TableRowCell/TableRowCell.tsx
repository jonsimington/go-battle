import React, { FC } from 'react';
import styles from './TableRowCell.module.css';
import { styled } from "@stitches/react";
import get from "lodash.get";

import { IColumnType } from "../../DynamicTable";

interface TableRowCellProps<T> {
    item: T;
    column: IColumnType<T>;
}

const TableCell = styled("td", {
    padding: 12,
    fontSize: 14,
    color: "grey",
});

export function TableRowCell<T>({ item, column }: TableRowCellProps<T>): JSX.Element {
    const value = get(item, column.key);
    return (
        <TableCell>{column.render ? column.render(column, item) : value}</TableCell>
    );
}
