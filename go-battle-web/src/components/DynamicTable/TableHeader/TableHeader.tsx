import { styled } from "@stitches/react";
import { IColumnType } from "../DynamicTable";
import { COLORS } from '../../../utils/colors';

interface TableHeaderProps<T> {
    columns: IColumnType<T>[];
}

const TableHeaderCell = styled("th", {
    backgroundColor: COLORS.dark.secondary,
    padding: 12,
    fontWeight: 500,
    textAlign: "center",
    fontSize: 14,
    color: "white",
    "&:first-child": {
        borderTopLeftRadius: 12,
    },
    "&:last-child": {
        borderTopRightRadius: 12,
    },
    position: "sticky",
    top: 0,
    zIndex: 100
});

export function TableHeader<T>({ columns }: TableHeaderProps<T>): JSX.Element {
    return (
        <tr>
            {columns.map((column, columnIndex) => (
                <TableHeaderCell key={`table-head-cell-${columnIndex}`} style={{ width: column.width }}>
                    {column.title}
                </TableHeaderCell>
            ))}
        </tr>
    );
}
