import styles from './SearchMatches.module.css';
import { DynamicTable, IColumnType  } from '../../DynamicTable/DynamicTable';
import { MatchesResult } from '../../../models/MatchesResult';
import { FaCirclePlay, FaX } from 'react-icons/fa6';
import { Alert, Button, Modal, Toast } from 'react-bootstrap';
import { pluck, prettyDate } from '../../../utils/utils';
import { useState } from 'react';
import { rejects } from 'assert';

interface SearchMatchesProps {
    tableData: any[]
}

export function SearchMatches({ tableData }: SearchMatchesProps): JSX.Element {
    let data: MatchesResult[] = tableData;

    const columns: IColumnType<MatchesResult>[] = [
        {
            key: "ID",
            title: "ID",
            width: 50,
        },
        {
            key: "numGames",
            title: "# Games",
            width: 100,
        },
        {
            key: "games",
            title: "Games",
            width: 125,
            render: (_, { games }) => {
                const gameIds = games.map(pluck('ID')).join(', ');
    
                if(gameIds.length > 0) {
                    return (
                        <a href={`${window.location.origin}/games/search?ids=${encodeURI(gameIds)}`}>{gameIds}</a>
                    )
                }
                else {
                    return (
                        <span>No Games Yet</span>
                    )
                }
            }
        },
        {
            key: "players",
            title: "Players",
            width: 200,
            render: (_, { players }) => {
                const playerIds = players.map(pluck('ID')).join(', ');
                const playerNames = players.map(pluck('name')).join(', ');
    
                if(playerIds.length > 0) {
                    return (
                        <a href={`${window.location.origin}/players/search?ids=${encodeURI(playerIds)}`}>{playerNames}</a>
                    )
                }
                else {
                    return (
                        <span>No Players</span>
                    )
                }
            }
        },
        {
            key: "CreatedAt",
            title: "Created At",
            width: 200,
            render: (_, { CreatedAt }) => {
                return prettyDate(CreatedAt.toString())
            }
        },
        {
            key: "status",
            title: "Status",
            width: 125,
        },
        {
            key: "startMatch",
            title: "Start Match",
            width: 100,
            render: (_, { ID, status }) => {
                return (
                    <>
                        <div className="text-center">
                            {status === "Pending" &&
                                <Button variant="outline-success" onClick={() => startMatch(ID)}>
                                    <h3><FaCirclePlay /></h3>
                                </Button>
                            }
                        </div>
                    </>
                )
            }
        },
        {
            key: "deleteMatch",
            title: "Delete Match",
            width: 110,
            render: (_, { ID }) => {
                return (
                    <>
                        <div className="text-center">
                            <Button variant="outline-danger" onClick={() => deleteMatch(ID)}>
                                <h3><FaX /></h3>
                            </Button>
                        </div>
                    </>
                )
            }
        },
    ];

    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [hasApiResponse, setHasApiResponse] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleFetchResponse = async (response: Response) => {
        setHasApiResponse(true);
        setShowToast(true);
        const responseText = await response.text();
        setAlertText(`HTTP ${response.status}: ${responseText}`);

        if (response.ok) {
            setHasWarning(false);
            setHasError(false);
        } else if (response.status === 400) {
            setHasWarning(true);
        } else if (response.status === 500) {
            console.error(response.text);
            setHasError(true);
            return Promise.reject()
        }
    }

    const startMatch = (matchID: number) =>  {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        };
    
        const apiUrl = process.env.REACT_APP_API_URL;
    
        fetch(`${apiUrl}/matches/start?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response));
    }

    const deleteMatch = (matchID: number) =>  {
        const requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };
    
        const apiUrl = process.env.REACT_APP_API_URL;
    
        fetch(`${apiUrl}/matches?match_id=${matchID}`, requestOptions)
            .then(async response => handleFetchResponse(response))
            .then(() => removeMatchFromTable(matchID));
    }

    const removeMatchFromTable = (matchID: number) => {
        console.log(`rows before: ${data.length}`)
        data = data.filter((m: MatchesResult) => m.ID != matchID)
        console.log(`rows after: ${data.length}`)
        
    }

    return (
        <>
        <h3>Matches</h3>

        <Toast className="my-3" 
            bg={hasError ? "danger" : hasWarning ? "warning" : "success"} 
            onClose={() => setShowToast(false)} 
            show={showToast} 
            delay={5000}
            animation={true}
            autohide>
            <Toast.Body>{alertText}</Toast.Body>
        </Toast>

        <DynamicTable data={data} columns={columns} />
        </>
    );
}
