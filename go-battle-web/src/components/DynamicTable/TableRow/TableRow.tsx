import { styled } from "@stitches/react";
import { IColumnType } from "../DynamicTable";
import { TableRowCell } from './TableRowCell/TableRowCell';
import { COLORS } from '../../../utils/colors';

interface TableRowProps<T> {
    data: T[];
    columns: IColumnType<T>[];
}

const TableRowItem = styled("tr", {
    cursor: "auto",
    "&": {
        backgroundColor: COLORS.dark.primary,
    },
    "&:last-child": {
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
    },
    "&:hover": {
        backgroundColor: COLORS.dark.secondary,
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
                        index={itemIndex}
                    />
                ))}
            </TableRowItem>
        ))}
        </>
    );
}
