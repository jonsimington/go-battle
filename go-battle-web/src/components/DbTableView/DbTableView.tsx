import { SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';
import { useSearchParams } from 'react-router-dom';
import { ApiResult } from '../../models/ApiResult';
import { SearchTournaments } from '../Tournaments/SearchTournaments/SearchTournaments';
import { Col, Container, Dropdown, Pagination, Row } from 'react-bootstrap';
import range from 'lodash/range';
import { getApiUrl, getPagesToDisplay } from '../../utils/utils';

interface DbTableViewProps {
    context: string;
}

// Hoisted constants outside component — no re-creation each render
const apiUrl = getApiUrl();
const resultsPerPageOptions = [5, 10, 15, 20];
const pagesWithPagination = ["matches", "games", "tournaments"];

export function DbTableView({ context }: DbTableViewProps): JSX.Element {
    const [data, setData] = useState<ApiResult[]>();
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    const [resultsPerPage, setResultsPerPage] = useState(10);
    const [selectedPage, setSelectedPage] = useState(1);

    const shouldShowPagination = pagesWithPagination.includes(context);

    // Fetch data from api
    const fetchFromApi = useCallback(() => {
        setLoading(true);
        let url = `${apiUrl}/${context}`;
        const ids = searchParams.get("ids");
        const players = searchParams.get("players");

        if (ids != null) {
            url += `?ids=${encodeURI(ids)}`;
        }
        if (players != null) {
            url += `?players=${encodeURI(players)}`;
        }

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: ApiResult[]) => {
            json.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0);
            setData(json);
            setSelectedPage(1);
          })
          .catch(error => console.error(error))
          .finally(() => setLoading(false));
    }, [context, searchParams]);

    useEffect(() => {
        setData(undefined);
        fetchFromApi();
    }, [fetchFromApi]);

    // Derive all pagination state via useMemo — no cascading useEffect chains
    const numPages = useMemo(
        () => data ? Math.ceil(data.length / resultsPerPage) : 1,
        [data, resultsPerPage]
    );

    const displayedData = useMemo(() => {
        if (!data) return undefined;
        const totalPages = Math.ceil(data.length / resultsPerPage);
        if (selectedPage > 0 && selectedPage <= totalPages) {
            const start = (selectedPage - 1) * resultsPerPage;
            const end = selectedPage === totalPages ? data.length : start + resultsPerPage;
            return data.slice(start, end);
        }
        return data;
    }, [data, selectedPage, resultsPerPage]);

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
    };

    function handleResultsPerPageChange(eventKey: string | null, e: SyntheticEvent<unknown, Event>): void {
        if(eventKey !== null) {
            setResultsPerPage(+eventKey);
        }
    }

    return (
        <>
            {loading ? (
                <h3><FaSpinner className="icon-spin"></FaSpinner></h3>
            ) : (
                <>
                    {context === "players" ? (
                        <SearchPlayers tableData={data ?? []} refreshData={fetchFromApi} />
                    ) : context === "games" ? (
                        <SearchGames tableData={displayedData ?? []} refreshData={fetchFromApi} />
                    ) : context === "matches" ? (
                        <SearchMatches tableData={displayedData ?? []} refreshData={fetchFromApi} />
                    ) : context === "clients" ? (
                        <SearchClients tableData={data ?? []} refreshData={fetchFromApi} />
                    ) : context === "tournaments" ? (
                        <SearchTournaments tableData={displayedData ?? []} refreshData={fetchFromApi} />
                    ) : null}
                    
                    {data !== undefined && data.length > 0 && shouldShowPagination ? (
                        <Container>
                            <Row className="my-2 align-items-center gy-2">
                                <Col xs={12} md={3}>
                                    <Dropdown autoClose={true} onSelect={handleResultsPerPageChange}>
                                        <Dropdown.Toggle variant="outline-info" id="dropdown-basic" size="sm">
                                            Results Per Page ({resultsPerPage})
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {resultsPerPageOptions.map((o) => (
                                                <Dropdown.Item eventKey={o} active={resultsPerPage === o} key={`results-dropdown-${o}`}>{o}</Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                                <Col xs={12} md={9} className="d-flex justify-content-center">
                                    <Pagination size="sm" className="flex-wrap mb-0">
                                        <Pagination.First onClick={() => handlePageChange(1)} disabled={selectedPage === 1} />
                                        <Pagination.Prev onClick={() => handlePageChange(selectedPage - 1)} disabled={selectedPage === 1} />
                                        <Pagination.Ellipsis hidden={!showEllipsesBefore} disabled />
                                        {displayedPages.map((n) => (
                                            <Pagination.Item
                                                onClick={() => handlePageChange(n)}
                                                key={`pagination-page-${n}`}    
                                                active={n === selectedPage}
                                            >
                                                {n}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Ellipsis hidden={!showEllipsesAfter} disabled />
                                        <Pagination.Next onClick={() => handlePageChange(selectedPage + 1)} disabled={selectedPage === numPages} />
                                        <Pagination.Last onClick={() => handlePageChange(numPages)} disabled={selectedPage === numPages} />
                                    </Pagination>
                                </Col>
                            </Row>
                        </Container>
                    ) : null}
                </>
            )}
        </>
    );
}
