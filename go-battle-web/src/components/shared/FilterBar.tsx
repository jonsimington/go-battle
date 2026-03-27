import { FaSortUp, FaSortDown } from 'react-icons/fa6';
import s from './FilterBar.module.css';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterConfig {
    key: string;
    label: string;
    options: FilterOption[];
}

export interface SortOption {
    field: string;
    label: string;
}

export interface FilterBarProps {
    filters: FilterConfig[];
    filterValues: Record<string, string>;
    onFilterChange: (key: string, value: string) => void;
    sortOptions: SortOption[];
    sortField: string;
    sortDir: 'asc' | 'desc';
    onSortChange: (field: string, dir: 'asc' | 'desc') => void;
    totalCount?: number;
    onClear: () => void;
}

export function FilterBar({
    filters,
    filterValues,
    onFilterChange,
    sortOptions,
    sortField,
    sortDir,
    onSortChange,
    totalCount,
    onClear,
}: FilterBarProps): JSX.Element {
    const hasActiveFilters = Object.values(filterValues).some(v => v !== '');
    const isNonDefaultSort = sortField !== 'created_at' || sortDir !== 'desc';

    const handleSortClick = (field: string) => {
        if (sortField === field) {
            onSortChange(field, sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            onSortChange(field, 'desc');
        }
    };

    return (
        <div className={s.filterBar}>
            <div className={s.filtersRow}>
                {filters.map(filter => (
                    <div key={filter.key} className={s.filterGroup}>
                        <span className={s.filterLabel}>{filter.label}</span>
                        <select
                            className={`${s.filterSelect} ${filterValues[filter.key] ? s.filterSelectActive : ''}`}
                            value={filterValues[filter.key] || ''}
                            onChange={e => onFilterChange(filter.key, e.target.value)}
                        >
                            <option value="">All</option>
                            {filter.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                ))}
                {(hasActiveFilters || isNonDefaultSort) && (
                    <button className={s.clearBtn} onClick={onClear}>
                        Clear
                    </button>
                )}
            </div>

            {filters.length > 0 && sortOptions.length > 0 && (
                <div className={s.separator} />
            )}

            <div className={s.sortRow}>
                {sortOptions.map(opt => {
                    const isActive = sortField === opt.field;
                    return (
                        <button
                            key={opt.field}
                            className={`${s.sortBtn} ${isActive ? s.sortBtnActive : ''}`}
                            onClick={() => handleSortClick(opt.field)}
                        >
                            {opt.label}
                            {isActive && (
                                <span className={s.sortIcon}>
                                    {sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />}
                                </span>
                            )}
                        </button>
                    );
                })}
                {totalCount !== undefined && (
                    <span className={s.resultCount}>
                        {totalCount} result{totalCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
        </div>
    );
}
