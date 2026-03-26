import { styled } from "@stitches/react";
import { TableHeader } from './TableHeader/TableHeader';
import { TableRow } from './TableRow/TableRow';

interface DynamicTableProps<T> {
    data: T[]
    columns: IColumnType<T>[]
    onRowClick?: (item: T) => void
}

export interface IColumnType<T> {
    key: string;
    title: string;
    width?: number;
    render?: (column: IColumnType<T>, item: T, index?: number) => React.ReactNode;
  }

const ScrollWrapper = styled("div", {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
});

const TableWrapper = styled("table", {
    borderCollapse: "collapse",
    border: "none",
    width: "100%",
    minWidth: "600px",
    marginBottom: "1em",
    borderRadius: "6px",
    overflow: "hidden"
});

export function DynamicTable<T>({ data, columns, onRowClick }: DynamicTableProps<T>): JSX.Element {
    return (
        <ScrollWrapper>
            <TableWrapper>
                <thead>
                    <TableHeader columns={columns} />
                </thead>
                <tbody>
                    <TableRow data={data} columns={columns} onRowClick={onRowClick} />
                </tbody>
            </TableWrapper>
        </ScrollWrapper>
      );
}
