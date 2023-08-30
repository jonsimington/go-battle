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
    "&": {
        backgroundColor: "#212529",
    },
    "&:last-child": {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    "&:hover": {
        backgroundColor: "#343a40",
    }
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
