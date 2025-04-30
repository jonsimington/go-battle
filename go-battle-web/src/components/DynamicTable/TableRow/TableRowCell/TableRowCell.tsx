import { styled } from "@stitches/react";
import get from "lodash.get";
import { ReactNode } from "react";

import { IColumnType } from "../../DynamicTable";
import { COLORS } from '../../../../utils/colors';

interface TableRowCellProps<T> {
    item: T;
    column: IColumnType<T>;
    index: number;
}

const TableCell = styled("td", {
    padding: 12,
    fontSize: 14,
    color: COLORS.dark.text.secondary,
    textAlign: "center",
});

export function TableRowCell<T>({ item, column, index }: TableRowCellProps<T>): JSX.Element {
    const value = get(item, column.key);
    let cellContent: ReactNode;
    
    if (column.render) {
        // Capture the rendered content as a React node
        cellContent = column.render(column, item, index);
    } else {
        cellContent = value;
    }
    
    return <TableCell>{cellContent}</TableCell>;
}
