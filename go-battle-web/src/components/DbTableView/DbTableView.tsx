import { useEffect, useState } from 'react';
import styles from './DbTableView.module.css';
import { FaSpinner } from "react-icons/fa6";
import { SearchPlayers } from '../Players/SearchPlayers/SearchPlayers';
import { SearchGames } from '../Games/SearchGames/SearchGames';
import { SearchMatches } from '../Matches/SearchMatches/SearchMatches';
import { SearchClients } from '../Clients/SearchClients/SearchClients';
import { useSearchParams } from 'react-router-dom';
import { ApiResult } from '../../models/ApiResult';
import { SearchTournaments } from '../Tournaments/SearchTournaments/SearchTournaments';
import { Pagination } from 'react-bootstrap';
import { delay } from '../../utils/utils';

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


    const apiUrl = process.env.REACT_APP_API_URL;
    
    // fetch data from api
    useEffect(() => {
        fetchFromApi();
    }, []);

    // update number of pages any time data changes
    useEffect(() => {
        if(data !== undefined && data?.length > 0) {
            setNumPages(Math.ceil(data.length / resultsPerPage))
        }
    }, [data]);

    // update displayedData anytime the selectedPage changes
    useEffect(() => {
        if(data !== undefined) {
            let pagedData = getPagedData(selectedPage, data ?? []);

            setDisplayedData(pagedData);
        }
    }, [selectedPage]);

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
                        <SearchGames tableData={data ?? []} refreshData={fetchFromApi} />
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
                    {data !== undefined && data.length > 0 &&
                        <Pagination className="mt-2">
                            <Pagination.First onClick={() => handlePageChange(1)} disabled={selectedPage === 1} />
                            <Pagination.Prev onClick={() => handlePageChange(selectedPage - 1)} disabled={selectedPage === 1} />
                            
                            {Array.from(Array(numPages).keys()).map((n) => {
                                return (
                                    <Pagination.Item
                                        onClick={() => handlePageChange(n + 1)}
                                        key={`pagination-page-${n}`}    
                                        active={n + 1 === selectedPage}
                                        >
                                            {n + 1}
                                    </Pagination.Item>
                                )
                            })}
                            
                            <Pagination.Next onClick={() => handlePageChange(selectedPage + 1)} disabled={selectedPage === numPages} />
                            <Pagination.Last onClick={() => handlePageChange(numPages)} disabled={selectedPage === numPages} />
                            
                            {/* <Pagination.Ellipsis /> */}

                        </Pagination>
                    }
                </>
            )
            }
        </>
      );
}
