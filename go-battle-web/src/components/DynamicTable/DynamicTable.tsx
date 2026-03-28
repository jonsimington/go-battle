import { styled } from "@stitches/react";
import get from "lodash.get";
import { TableHeader } from './TableHeader/TableHeader';
import { TableRow } from './TableRow/TableRow';
import dt from './DynamicTable.module.css';

interface DynamicTableProps<T> {
    data: T[]
    columns: IColumnType<T>[]
    onRowClick?: (item: T) => void
}

export interface IColumnType<T> {
    key: string;
    title: string;
    width?: number;
    mobileLayout?: 'stacked';
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
    borderRadius: "6px",
    overflow: "hidden"
});

export function DynamicTable<T>({ data, columns, onRowClick }: DynamicTableProps<T>): JSX.Element {
    const labeledColumns = columns.filter(c => c.title);
    const actionColumns = columns.filter(c => !c.title);

    return (
        <>
            {/* Desktop table */}
            <ScrollWrapper className={dt.tableScrollWrapper}>
                <TableWrapper>
                    <thead>
                        <TableHeader columns={columns} />
                    </thead>
                    <tbody>
                        <TableRow data={data} columns={columns} onRowClick={onRowClick} />
                    </tbody>
                </TableWrapper>
            </ScrollWrapper>

            {/* Mobile card list */}
            <div className={dt.cardList}>
                {data.map((item, index) => (
                    <div
                        key={index}
                        className={dt.card}
                        onClick={onRowClick ? () => onRowClick(item) : undefined}
                        style={onRowClick ? { cursor: 'pointer' } : undefined}
                    >
                        {labeledColumns.map((col, colIdx) => (
                            col.mobileLayout === 'stacked' ? (
                                <div key={colIdx} className={dt.cardRowStacked}>
                                    <span className={dt.cardLabel}>{col.title}</span>
                                    <div className={dt.cardValueFull}>
                                        {col.render ? col.render(col, item, index) : String(get(item, col.key) ?? '')}
                                    </div>
                                </div>
                            ) : (
                                <div key={colIdx} className={dt.cardRow}>
                                    <span className={dt.cardLabel}>{col.title}</span>
                                    <span className={dt.cardValue}>
                                        {col.render ? col.render(col, item, index) : String(get(item, col.key) ?? '')}
                                    </span>
                                </div>
                            )
                        ))}
                        {actionColumns.length > 0 && (
                            <div className={dt.cardActions}>
                                {actionColumns.map((col, colIdx) => (
                                    <span key={colIdx}>
                                        {col.render ? col.render(col, item, index) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
      );
}
