import styles from './DynamicTable.module.css';
import { styled } from "@stitches/react";
import { TableHeader } from './TableHeader/TableHeader';
import { TableRow } from './TableRow/TableRow';

interface DynamicTableProps<T> {
    data: T[]
    columns: IColumnType<T>[]
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
    maxWidth: "95%",
    minWidth: "75%",
    marginBottom: "1em"
});

export function DynamicTable<T>({ data, columns }: DynamicTableProps<T>): JSX.Element {
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
