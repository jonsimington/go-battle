import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';
import { useSearchParams } from 'react-router-dom';
import { ApiResult } from '../../models/ApiResult';
import { PaginatedResponse } from '../../models/PaginatedResponse';
import { SearchTournaments } from '../Tournaments/SearchTournaments/SearchTournaments';
import range from 'lodash/range';
import { getApiUrl, getPagesToDisplay } from '../../utils/utils';
import { FilterBar, FilterConfig, SortOption } from '../shared/FilterBar';
import RefreshButton from '../Common/RefreshButton';
import p from '../shared/Pagination.module.css';
import d from './DbTableView.module.css';

interface DbTableViewProps {
    context: string;
}

// Hoisted constants outside component — no re-creation each render
const apiUrl = getApiUrl();
const resultsPerPageOptions = [5, 10, 15, 20];
const pagesWithPagination = ["matches", "games", "tournaments"];

const filterConfigs: Record<string, FilterConfig[]> = {
    games: [
        {
            key: 'status',
            label: 'Status',
            options: [
                { value: 'Complete', label: 'Complete' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Error', label: 'Error' },
                { value: 'Canceled', label: 'Canceled' },
            ],
        },
    ],
    matches: [
        {
            key: 'status',
            label: 'Status',
            options: [
                { value: 'Complete', label: 'Complete' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Stopped', label: 'Stopped' },
                { value: 'Error', label: 'Error' },
            ],
        },
    ],
    tournaments: [
        {
            key: 'status',
            label: 'Status',
            options: [
                { value: 'Completed', label: 'Completed' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Pending', label: 'Pending' },
            ],
        },
        {
            key: 'type',
            label: 'Type',
            options: [
                { value: 'swiss', label: 'Swiss' },
                { value: 'round-robin', label: 'Round Robin' },
            ],
        },
    ],
    clients: [
        {
            key: 'language',
            label: 'Language',
            options: [
                { value: 'py', label: 'Python' },
                { value: 'js', label: 'JavaScript' },
                { value: 'cpp', label: 'C++' },
            ],
        },
        {
            key: 'game',
            label: 'Game',
            options: [
                { value: 'chess', label: 'Chess' },
            ],
        },
    ],
};

const sortConfigs: Record<string, SortOption[]> = {
    games: [
        { field: 'created_at', label: 'Date' },
        { field: 'id', label: 'ID' },
        { field: 'status', label: 'Status' },
    ],
    matches: [
        { field: 'created_at', label: 'Date' },
        { field: 'id', label: 'ID' },
        { field: 'status', label: 'Status' },
    ],
    tournaments: [
        { field: 'created_at', label: 'Date' },
        { field: 'id', label: 'ID' },
        { field: 'status', label: 'Status' },
        { field: 'name', label: 'Name' },
    ],
    clients: [],
};

export function DbTableView({ context }: DbTableViewProps): JSX.Element {
    const [data, setData] = useState<ApiResult[]>();
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    const [resultsPerPage, setResultsPerPage] = useState(10);
    const [selectedPage, setSelectedPage] = useState(1);

    // Server-side pagination state
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter & sort state
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const shouldShowPagination = pagesWithPagination.includes(context);
    const contextFilters = filterConfigs[context] ?? [];
    const contextSorts = sortConfigs[context] ?? [];
    const hasFilterBar = contextFilters.length > 0 || contextSorts.length > 0;

    // Use a ref so fetchFromApi always sees the latest filter/sort values
    const filtersRef = useRef(filterValues);
    filtersRef.current = filterValues;
    const sortFieldRef = useRef(sortField);
    sortFieldRef.current = sortField;
    const sortDirRef = useRef(sortDir);
    sortDirRef.current = sortDir;

    // Fetch data from api
    const fetchFromApi = useCallback((page?: number, pageSize?: number) => {
        setLoading(true);
        let url = `${apiUrl}/${context}`;
        const ids = searchParams.get("ids");
        const players = searchParams.get("players");

        const params = new URLSearchParams();

        if (ids != null) {
            params.set("ids", ids);
        }
        if (players != null) {
            params.set("players", players);
        }

        // Add pagination params for paginated contexts
        if (shouldShowPagination) {
            params.set("page", String(page ?? selectedPage));
            params.set("page_size", String(pageSize ?? resultsPerPage));
        }

        // Add filter params
        const currentFilters = filtersRef.current;
        for (const [key, value] of Object.entries(currentFilters)) {
            if (value) {
                params.set(key, value);
            }
        }

        // Add sort params for server-side paginated contexts
        if (shouldShowPagination) {
            params.set("sort", sortFieldRef.current);
            params.set("sort_dir", sortDirRef.current);
        }

        const qs = params.toString();
        if (qs) {
            url += `?${qs}`;
        }

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: PaginatedResponse | ApiResult[]) => {
            if (shouldShowPagination && !Array.isArray(json)) {
                // Server-side paginated response
                const paginated = json as PaginatedResponse;
                setData(paginated.data ?? []);
                setTotalCount(paginated.totalCount);
                setTotalPages(paginated.totalPages);
            } else {
                // Non-paginated endpoints (players, clients) return raw arrays
                const arr = json as ApiResult[];
                arr.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0);
                setData(arr);
                setTotalCount(arr.length);
            }
          })
          .catch(error => console.error(error))
          .finally(() => setLoading(false));
    }, [context, searchParams, shouldShowPagination, selectedPage, resultsPerPage]);

    useEffect(() => {
        setData(undefined);
        setSelectedPage(1);
        // Initialize filter values from URL params (e.g. ?status=Complete from dashboard)
        const initialFilters: Record<string, string> = {};
        for (const config of filterConfigs[context] ?? []) {
            const val = searchParams.get(config.key);
            if (val) initialFilters[config.key] = val;
        }
        setFilterValues(initialFilters);
        filtersRef.current = initialFilters;
        setSortField('created_at');
        setSortDir('desc');
        fetchFromApi(1, resultsPerPage);
    // Only re-fetch when the context or search params change, not on every page/pageSize change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context, searchParams]);

    const handleFilterChange = (key: string, value: string) => {
        setFilterValues(prev => {
            const next = { ...prev, [key]: value };
            // Update the ref synchronously so fetchFromApi sees the new value
            filtersRef.current = next;
            return next;
        });
        setSelectedPage(1);
        // Use setTimeout(0) to ensure state and ref are consistent before fetch
        setTimeout(() => fetchFromApi(1, resultsPerPage), 0);
    };

    const handleSortChange = (field: string, dir: 'asc' | 'desc') => {
        setSortField(field);
        setSortDir(dir);
        sortFieldRef.current = field;
        sortDirRef.current = dir;
        setSelectedPage(1);
        setTimeout(() => fetchFromApi(1, resultsPerPage), 0);
    };

    const handleClearFilters = () => {
        setFilterValues({});
        setSortField('created_at');
        setSortDir('desc');
        filtersRef.current = {};
        sortFieldRef.current = 'created_at';
        sortDirRef.current = 'desc';
        setSelectedPage(1);
        setTimeout(() => fetchFromApi(1, resultsPerPage), 0);
    };

    // Derive pagination for non-paginated contexts (players, clients) — client-side
    const numPages = useMemo(() => {
        if (shouldShowPagination) return totalPages;
        return data ? Math.ceil(data.length / resultsPerPage) : 1;
    }, [data, resultsPerPage, shouldShowPagination, totalPages]);

    const displayedData = useMemo(() => {
        if (!data) return undefined;
        if (shouldShowPagination) {
            // Data is already the current page from the server
            return data;
        }
        // Client-side pagination for non-paginated contexts
        const pages = Math.ceil(data.length / resultsPerPage);
        if (selectedPage > 0 && selectedPage <= pages) {
            const start = (selectedPage - 1) * resultsPerPage;
            const end = selectedPage === pages ? data.length : start + resultsPerPage;
            return data.slice(start, end);
        }
        return data;
    }, [data, selectedPage, resultsPerPage, shouldShowPagination]);

    const displayedPages = useMemo(
        () => getPagesToDisplay(numPages, selectedPage),
        [numPages, selectedPage]
    );

    const showEllipsesBefore = useMemo(() => {
        if (numPages < 10) return false;
        return !range(1, selectedPage, 1).every(v => displayedPages.includes(v));
    }, [numPages, selectedPage, displayedPages]);

    const showEllipsesAfter = useMemo(() => {
        if (numPages < 10) return false;
        return !range(selectedPage, numPages + 1, 1).every(v => displayedPages.includes(v));
    }, [numPages, selectedPage, displayedPages]);

    const handlePageChange = (pageNumber: number) => {
        setSelectedPage(pageNumber);
        if (shouldShowPagination) {
            fetchFromApi(pageNumber, resultsPerPage);
        }
    };

    const title = context.charAt(0).toUpperCase() + context.slice(1);

    return (
        <div className={d.container}>
            <h3 className={d.title}>{title}</h3>
            {!loading && (
                <div className={d.toolbar}>
                    {hasFilterBar ? (
                        <FilterBar
                            filters={contextFilters}
                            filterValues={filterValues}
                            onFilterChange={handleFilterChange}
                            sortOptions={contextSorts}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSortChange={handleSortChange}
                            totalCount={shouldShowPagination ? totalCount : (data?.length ?? 0)}
                            onClear={handleClearFilters}
                        />
                    ) : <span />}
                    <RefreshButton
                        onRefresh={async () => { fetchFromApi(selectedPage, resultsPerPage); }}
                    />
                </div>
            )}
            {loading ? (
                <h3><FaSpinner className="icon-spin"></FaSpinner></h3>
            ) : (
                <>
                    {context === "players" ? (
                        <SearchPlayers tableData={data ?? []} refreshData={() => fetchFromApi()} />
                    ) : context === "games" ? (
                        <div className={d.tableCard}><SearchGames tableData={displayedData ?? []} refreshData={() => fetchFromApi(selectedPage, resultsPerPage)} /></div>
                    ) : context === "matches" ? (
                        <div className={d.tableCard}><SearchMatches tableData={displayedData ?? []} refreshData={() => fetchFromApi(selectedPage, resultsPerPage)} /></div>
                    ) : context === "clients" ? (
                        <div className={d.tableCard}><SearchClients tableData={data ?? []} refreshData={() => fetchFromApi()} /></div>
                    ) : context === "tournaments" ? (
                        <div className={d.tableCard}><SearchTournaments tableData={displayedData ?? []} refreshData={() => fetchFromApi(selectedPage, resultsPerPage)} /></div>
                    ) : null}
                    
                    {data !== undefined && data.length > 0 && (shouldShowPagination || (data.length > resultsPerPage)) ? (
                        <div className={p.paginationBar}>
                            <div className={p.perPageGroup}>
                                <span className={p.perPageLabel}>Per page</span>
                                <select
                                    className={p.perPageSelect}
                                    value={resultsPerPage}
                                    onChange={e => {
                                        const newSize = +e.target.value;
                                        setResultsPerPage(newSize);
                                        setSelectedPage(1);
                                        if (shouldShowPagination) {
                                            fetchFromApi(1, newSize);
                                        }
                                    }}
                                >
                                    {resultsPerPageOptions.map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={p.pageButtons}>
                                <button
                                    className={p.pageBtn}
                                    onClick={() => handlePageChange(1)}
                                    disabled={selectedPage === 1}
                                    aria-label="First page"
                                >
                                    &laquo;
                                </button>
                                <button
                                    className={p.pageBtn}
                                    onClick={() => handlePageChange(selectedPage - 1)}
                                    disabled={selectedPage === 1}
                                    aria-label="Previous page"
                                >
                                    &lsaquo;
                                </button>
                                {showEllipsesBefore && <span className={p.ellipsis}>&hellip;</span>}
                                {displayedPages.map(n => (
                                    <button
                                        key={n}
                                        className={`${p.pageBtn} ${n === selectedPage ? p.pageBtnActive : ''}`}
                                        onClick={() => handlePageChange(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                                {showEllipsesAfter && <span className={p.ellipsis}>&hellip;</span>}
                                <button
                                    className={p.pageBtn}
                                    onClick={() => handlePageChange(selectedPage + 1)}
                                    disabled={selectedPage === numPages}
                                    aria-label="Next page"
                                >
                                    &rsaquo;
                                </button>
                                <button
                                    className={p.pageBtn}
                                    onClick={() => handlePageChange(numPages)}
                                    disabled={selectedPage === numPages}
                                    aria-label="Last page"
                                >
                                    &raquo;
                                </button>
                            </div>
                            {shouldShowPagination ? (
                                <span className={p.resultCount}>{totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                            ) : <span />}
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
