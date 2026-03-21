import { styled } from "@stitches/react";
import { IColumnType } from "../DynamicTable";
import { COLORS } from '../../../utils/colors';

interface TableHeaderProps<T> {
    columns: IColumnType<T>[];
}

const TableHeaderCell = styled("th", {
    backgroundColor: COLORS.dark.secondary,
    padding: 12,
    fontWeight: 600,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.dark.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    borderBottom: `1px solid ${COLORS.dark.border}`,
    "&:first-child": {
        borderTopLeftRadius: 6,
    },
    "&:last-child": {
        borderTopRightRadius: 6,
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
