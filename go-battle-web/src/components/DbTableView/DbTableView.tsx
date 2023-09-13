import { SyntheticEvent, useEffect, useState } from 'react';
import styles from './DbTableView.module.css';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';
import { useSearchParams } from 'react-router-dom';
import { ApiResult } from '../../models/ApiResult';
import { SearchTournaments } from '../Tournaments/SearchTournaments/SearchTournaments';
import { Col, Container, Dropdown, Pagination, Row } from 'react-bootstrap';
import { range } from 'lodash';

interface DbTableViewProps<T> {
    context: string;
}

export function DbTableView<T>({ context }: DbTableViewProps<T>): JSX.Element {
    const [data, setData] = useState<ApiResult[]>();
    const [displayedData, setDisplayedData] = useState<ApiResult[]>();
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const [numPages, setNumPages] = useState(1);
    const [resultsPerPage, setResultsPerPage] = useState(10);
    const [selectedPage, setSelectedPage] = useState(1);
    const [showElipsesBeforeSelectedPage, setShowElipsesBeforeSelectedPage] = useState(false);
    const [showElipsesAfterSelectedPage, setShowElipsesAfterSelectedPage] = useState(false);
    const [displayedPages, setDisplayedPages] = useState<number[]>([]);

    const [shouldShowPagination, setShouldShowPagination] = useState(false);

    const apiUrl = process.env.REACT_APP_API_URL;

    const resultsPerPageOptions = [5, 10, 15, 20];
    const pagesWithPagination = ["matches", "games"];
    
    // fetch data from api
    useEffect(() => {
        fetchFromApi();

        if(pagesWithPagination.includes(context)) {
            setShouldShowPagination(true);
        }
    }, []);

    // update number of pages any time data changes
    useEffect(() => {
        if(data !== undefined && data?.length > 0) {
            let num_pages = Math.ceil(data.length / resultsPerPage);
            setNumPages(num_pages);

            if(numPages > 10) {
                setShowElipsesBeforeSelectedPage(true);
                setDisplayedPages(getPagesToDisplay());
            }
            else {
                setShowElipsesBeforeSelectedPage(false);
                setShowElipsesAfterSelectedPage(false);
                setDisplayedPages(getPagesToDisplay());
            }

        }
    }, [data, resultsPerPage]);

    // update displayedData anytime the selectedPage changes
    useEffect(() => {
        if(data !== undefined) {
            let pagedData = getPagedData(selectedPage, data ?? []);

            setDisplayedPages(getPagesToDisplay());
            setDisplayedData(pagedData);
        }
    }, [selectedPage, resultsPerPage]);

    // update elipses visibility when displayedPages changes
    useEffect(() => {
        setShowElipsesBeforeSelectedPage(shouldShowElipses("before"));
        setShowElipsesAfterSelectedPage(shouldShowElipses("after"));
    }, [displayedPages, resultsPerPage])

    const fetchFromApi = () => {
        setLoading(true);
        let url = `${apiUrl}/${context}`;
        let ids = searchParams.get("ids");
        let players = searchParams.get("players");

        if (ids != null) {
            url += `?ids=${encodeURI(ids)}`;
        }
        if (players != null) {
            url += `?players=${encodeURI(players)}`;
        }

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: ApiResult[]) => {
            // created desc
            
            json.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0);
            let pagedData = getPagedData(selectedPage, json);
            setDisplayedData(pagedData);
            setData(json);
          })
          .catch(error => console.error(error))
          .finally(() => setLoading(false));
    }

    const getPagedData = (pageNumber: number, results: ApiResult[]): ApiResult[] => {
        if (results !== undefined) {
            let pagedData = results;
            let numberOfPages = Math.ceil(results.length / resultsPerPage);
    
            if (pageNumber != null && pageNumber > 0 && pageNumber <= numPages) {
                let start = ((pageNumber-1) * resultsPerPage);
                let end = pageNumber == numberOfPages ? results.length : start + resultsPerPage;

                pagedData = pagedData.slice(start, end);
            }
    
            return pagedData;
        }
        else {
            return [];
        }
    }

    const handlePageChange = (pageNumber: number) => {
        setSelectedPage(pageNumber);
    };

    const getPagesToDisplay = (): number[] => {
        if (numPages < 10) {
            return range(1, numPages + 1, 1);
        }
        else if (selectedPage > 2 && selectedPage < numPages - 2) {
            return [selectedPage - 2, selectedPage - 1, selectedPage, selectedPage + 1, selectedPage + 2];
        }
        else if (selectedPage == 2) {
            return [selectedPage - 1, selectedPage, selectedPage + 1, selectedPage + 2, selectedPage + 3];
        }
        else if (selectedPage == 1) {
            return [selectedPage, selectedPage + 1, selectedPage + 2, selectedPage + 3, selectedPage + 4];
        }
        else if (selectedPage == numPages - 1) {
            return [selectedPage - 3, selectedPage - 2, selectedPage - 1, selectedPage, numPages];
        }
        else if (selectedPage == numPages - 2) {
            return [selectedPage - 2, selectedPage - 1, selectedPage, numPages - 1, numPages];
        }
        else if (selectedPage == numPages) {
            return [selectedPage - 4, selectedPage - 3, selectedPage - 2, selectedPage - 1, selectedPage];
        }
        return [];
    }

    const shouldShowElipses = (context: string): boolean => {
        if(numPages < 10) {
            return false;
        }
        else if (context === "before") {
            return !range(1, selectedPage, 1).every((v) => displayedPages?.includes(v))
        }
        else if (context === "after") {
            return !range(selectedPage, numPages+1, 1).every((v) => displayedPages?.includes(v))
        }
        return false;
    }

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
                    {context === "players" &&
                        <SearchPlayers tableData={data ?? []} refreshData={fetchFromApi} />
                    }
                    {context === "games" &&
                        <SearchGames tableData={displayedData ?? []} refreshData={fetchFromApi} />
                    }
                    {context === "matches" &&
                        <SearchMatches tableData={displayedData ?? []} refreshData={fetchFromApi} />
                    }
                    {context === "clients" &&
                        <SearchClients tableData={data ?? []} refreshData={fetchFromApi} />
                    }
                    {context === "tournaments" &&
                        <SearchTournaments tableData={data ?? []} refreshData={fetchFromApi} />
                    }
                    {data !== undefined && data.length > 0 && shouldShowPagination &&
                        <Container>
                            <Row className="my-2">
                                <Col>
                                    <Pagination>
                                        <Pagination.First onClick={() => handlePageChange(1)} disabled={selectedPage === 1} />
                                        <Pagination.Prev onClick={() => handlePageChange(selectedPage - 1)} disabled={selectedPage === 1} />
                                        <Pagination.Ellipsis hidden={!showElipsesBeforeSelectedPage} disabled />
                                        {displayedPages.map((n) => {
                                            return (
                                                <Pagination.Item
                                                    onClick={() => handlePageChange(n)}
                                                    key={`pagination-page-${n}`}    
                                                    active={n === selectedPage}
                                                    >
                                                        {n}
                                                </Pagination.Item>
                                            )
                                        })}
                                        <Pagination.Ellipsis hidden={!showElipsesAfterSelectedPage} disabled />
                                        <Pagination.Next onClick={() => handlePageChange(selectedPage + 1)} disabled={selectedPage === numPages} />
                                        <Pagination.Last onClick={() => handlePageChange(numPages)} disabled={selectedPage === numPages} />
                                    </Pagination>
                                </Col>
                                <Col lg="2">
                                    <Dropdown autoClose={true} onSelect={handleResultsPerPageChange}>
                                        <Dropdown.Toggle variant="outline-info" id="dropdown-basic">
                                            Results Per Page ({resultsPerPage})
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {resultsPerPageOptions.map((o) => {
                                                return <Dropdown.Item eventKey={o} active={resultsPerPage === o} key={`results-dropdown-${o}`}>{o}</Dropdown.Item>
                                            })}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                            </Row>
                        </Container>
                    }
                </>
            )
            }
        </>
      );
}
