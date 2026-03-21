import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useEffect, useState } from 'react';
import { Button, Badge, Card, Form, InputGroup, Row, Col, Dropdown, DropdownButton, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { calculateGameResult, calculateStreak, pluck } from '../../../utils/utils';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { FaInfinity, FaMagnifyingGlass, FaSort, FaSortDown, FaSortUp, FaMedal, FaTrophy, FaFire } from 'react-icons/fa6';
import EloBadge from '../../Common/ELO/ELOBadge';
import './SearchPlayers.css'; // Import the CSS

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
}

export function SearchPlayers({ tableData, refreshData }: SearchPlayersProps): JSX.Element {
    const [data, setData] = useState(tableData);
    const [filteredData, setFilteredData] = useState(tableData);
    const [sortType, setSortType] = useState("elo-desc");
    const [searchTerm, setSearchTerm] = useState("");
    const [eloMinFilter, setEloMinFilter] = useState("");
    const [eloMaxFilter, setEloMaxFilter] = useState("");

    useEffect(() => {
        const sortData = (sortType: any) => {
            let sortedData = [...data] as PlayersResult[];
    
            if(sortType === "created") {
                sortedData.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0)
            }
            else if(sortType === "created-desc") {
                sortedData.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0)
            }
            else if(sortType === "elo-desc") {
                sortedData.sort((a, b) => a.elo > b.elo ? -1 : a.elo < b.elo ? 1 : 0)
            }
            else if(sortType === "elo-asc") {
                sortedData.sort((a, b) => a.elo < b.elo ? -1 : a.elo > b.elo ? 1 : 0)
            }
            else if(sortType === "name-asc") {
                sortedData.sort((a, b) => a.name.localeCompare(b.name))
            }
            else if(sortType === "name-desc") {
                sortedData.sort((a, b) => b.name.localeCompare(a.name))
            }
            else if(sortType === "win-percent-desc") {
                sortedData.sort((a, b) => {
                    const aWinPercent = calculateWinPercentage(a);
                    const bWinPercent = calculateWinPercentage(b);
                    return aWinPercent > bWinPercent ? -1 : aWinPercent < bWinPercent ? 1 : 0;
                });
            }
            else if(sortType === "activity-desc") {
                sortedData.sort((a, b) => a.games.length > b.games.length ? -1 : a.games.length < b.games.length ? 1 : 0)
            }
    
            setData(sortedData);
        }

        sortData(sortType);
    }, [sortType]);

    useEffect(() => {
        // Filter data based on search term and ELO range
        let result = [...data] as PlayersResult[];
        
        if (searchTerm) {
            result = result.filter(player => 
                player.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (eloMinFilter) {
            const minElo = parseInt(eloMinFilter);
            if (!isNaN(minElo)) {
                result = result.filter(player => player.elo >= minElo);
            }
        }
        
        if (eloMaxFilter) {
            const maxElo = parseInt(eloMaxFilter);
            if (!isNaN(maxElo)) {
                result = result.filter(player => player.elo <= maxElo);
            }
        }
        
        setFilteredData(result);
    }, [data, searchTerm, eloMinFilter, eloMaxFilter]);

    const calculateWinPercentage = (player: PlayersResult): number => {
        const completeGames = player.games.filter(g => g.status === "Complete");
        const wins = completeGames.filter(g => g.winner?.ID === player.ID).length;
        const draws = completeGames.filter(g => g.draw).length;
        const numGames = completeGames.length;
        
        const winPercent = numGames > 0 ? ((2 * wins + draws) / (2 * numGames) * 100) : 0;
        return winPercent;
    };

    const renderRankBadge = (index: number) => {
        if (index === 0) return <FaTrophy className="text-warning" title="Top Ranked Player" />;
        if (index === 1) return <FaMedal className="text-light" title="2nd Place" />;
        if (index === 2) return <FaMedal className="text-orange" title="3rd Place" style={{color: '#f78166'}} />;
        return null;
    };

    const renderPlayerActivity = (games: any[]) => {
        const recentGames = games.filter(g => g.status === "Complete")
                               .sort((a, b) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0)
                               .slice(0, 15);
        
        if (recentGames.length === 0) return null;
        
        const lastPlayed = new Date(recentGames[0].UpdatedAt);
        const now = new Date();
        const daysSinceLastGame = Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 3600 * 24));
        
        if (daysSinceLastGame < 3) {
            return <Badge bg="success" className="ms-2">Active</Badge>;
        } else if (daysSinceLastGame < 14) {
            return <Badge bg="info" className="ms-2">Recent</Badge>;
        } else {
            return <Badge bg="secondary" className="ms-2">Inactive</Badge>;
        }
    };

    const columns: IColumnType<PlayersResult>[] = [
        {
            key: "rank",
            title: "#",
            width: 50,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult, index?: number) => {
                // Use a default value of 0 if index is undefined
                const displayIndex = typeof index === 'number' ? index : 0;
                return (
                    <div className="d-flex align-items-center">
                        <span className="me-2">{displayIndex + 1}</span>
                        {renderRankBadge(displayIndex)}
                    </div>
                );
            }
        },
        {
            key: "name",
            title: "Name",
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { name, ID, games } = item;
                return (
                    <div className="player-name-button-container" style={{ width: '100%', minWidth: '300px' }}>
                        <div className="bg-dark player-card" style={{ 
                            display: 'flex', 
                            borderRadius: '5px', 
                            overflow: 'hidden',
                            border: '1px solid #30363d',
                            width: '100%',
                            height: '42px'  // Increased from 38px to 42px for more height
                        }}>
                            <div className="name-section" style={{ 
                                flex: '1', 
                                padding: '10px 12px',  // Increased vertical padding from 8px to 10px
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#161b22',
                                textAlign: 'center'
                            }}>
                                <span className="fw-bold">{name}</span>
                                {renderPlayerActivity(games)}
                            </div>
                            <div style={{ display: 'flex' }}>
                                <a 
                                    href={`${window.location.origin}/games/search?players=${ID}`}
                                    className="action-link" 
                                    style={{ 
                                        padding: '10px 12px',  // Increased vertical padding from 8px to 10px
                                        backgroundColor: 'transparent',
                                        color: '#79c0ff',  // info color
                                        borderLeft: '1px solid #30363d',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    Games
                                </a>
                                <a 
                                    href={`${window.location.origin}/matches/search?players=${ID}`}
                                    className="action-link" 
                                    style={{ 
                                        padding: '10px 12px',  // Increased vertical padding from 8px to 10px
                                        backgroundColor: 'transparent',
                                        color: '#79c0ff',  // info color
                                        borderLeft: '1px solid #30363d',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    Matches
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            key: "wins",
            title: "W / L / D",
            width: 120,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { games, ID } = item;
                const completeGames = games.filter((g) => g.status === "Complete")
                const wins = completeGames.filter((g) => g.winner?.ID === ID).length;
                const losses = completeGames.filter((g) => g.loser?.ID === ID).length;
                const draws = completeGames.filter((g) => g.draw).length;
                const total = completeGames.length;

                return (
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id={`tooltip-${ID}-stats`}>
                                Total Games: {total}<br/>
                                Wins: {wins} ({Math.round((wins/Math.max(1, total))*100)}%)<br/>
                                Losses: {losses} ({Math.round((losses/Math.max(1, total))*100)}%)<br/>
                                Draws: {draws} ({Math.round((draws/Math.max(1, total))*100)}%)
                            </Tooltip>
                        }
                    >
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <span className="text-success fw-bold">{wins}</span>{" / "}
                                <span className="text-danger fw-bold">{losses}</span>{" / "}
                                <span className="text-secondary fw-bold">{draws}</span>
                            </div>
                            <div className="progress ms-2" style={{width: '40px', height: '5px'}}>
                                <div 
                                    className="progress-bar bg-success" 
                                    role="progressbar" 
                                    style={{width: `${total > 0 ? (wins/total)*100 : 0}%`}} 
                                    aria-valuenow={(wins/Math.max(1, total))*100} 
                                    aria-valuemin={0} 
                                    aria-valuemax={100}></div>
                            </div>
                        </div>
                    </OverlayTrigger>
                )
            }
        },
        {
            key: "streak",
            title: "Streak",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { games, ID } = item;
                let sortedGames = games.filter(g => g.status === "Complete").sort((a, b) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0);
                let streakResult = calculateStreak(sortedGames, ID);
                let streakType = streakResult.streakType;
                let streakCount = streakResult.streakCount;
                
                if (streakCount === 0) {
                    return <span className="text-secondary">-</span>;
                }
                
                if (streakType === "win" && streakCount > 0) {
                    return (
                        <div className="d-flex align-items-center">
                            <Badge bg="success" className="d-flex align-items-center">
                                <span className="me-1">{streakCount}W</span>
                                {streakCount >= 3 && <FaFire title="Hot streak!" />}
                            </Badge>
                        </div>
                    );
                }
                else if (streakType === "lose" && streakCount > 0) {
                    return (
                        <Badge bg="danger">{streakCount}L</Badge>
                    );
                }
                else if (streakType === "draw" && streakCount > 0) {
                    return (
                        <Badge bg="warning" text="dark">{streakCount}D</Badge>
                    );
                }
                
                return <span className="text-secondary">-</span>;
            }
        },
        {
            key: "win_percent",
            title: "Win %",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { games, ID } = item;
                const completeGames = games.filter((g) => g.status === "Complete")
                const wins = completeGames.filter((g) => g.winner?.ID === ID).length;
                const draws = completeGames.filter((g) => g.draw).length;
                const numGames = completeGames.length;
                const winPercent = Math.round(((2 * wins + draws) / (2 * numGames) * 100) * 100) / 100;

                if (!Number.isNaN(winPercent) && isFinite(winPercent)) {
                    return (
                        <div className="d-flex align-items-center">
                            <span className={winPercent >= 60 ? 'text-success fw-bold' : 
                                             winPercent >= 40 ? 'text-light' : 'text-danger'}>
                                {winPercent}%
                            </span>
                        </div>
                    );
                }
                else if (!Number.isNaN(winPercent) && !isFinite(winPercent)) {
                    return <FaInfinity></FaInfinity>
                }

                return "";
            }
        },
        {
            key: "elo",
            title: "ELO",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { elo, elo_history } = item;
                return (
                    <EloBadge elo={elo} eloHistory={elo_history} />
                )
            }
        },
        {
            key: "elo_history",
            title: "ELO History",
            width: 200,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { elo_history } = item;
                if (elo_history.length === 0) {
                    return "No History Yet";
                }
                else if (elo_history.length < 3) {
                    return "Not Enough History"
                }
                else {
                    let sortedHistory = elo_history.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 0 : 1);
                    let sortedElos = sortedHistory.map(pluck('elo'));

                    let sparklineColor = "#f85149"; // danger

                    let firstElo = sortedElos[0];
                    let lastElo = sortedElos[sortedElos.length - 1];
    
                    if (firstElo < lastElo) {
                        sparklineColor = "#3fb950"; // success
                    }

                    return (
                        <div className="d-flex align-items-center">
                            <Sparklines data={sortedElos} width={100} height={25} margin={5}>
                                <SparklinesLine color={sparklineColor} style={{ strokeWidth: 0.5 }} />
                                <SparklinesSpots size={1} style={{ fill: sparklineColor }} />
                            </Sparklines>
                            <Badge 
                                bg={firstElo < lastElo ? "success" : "danger"} 
                                className="ms-2">
                                {firstElo < lastElo ? "+" : ""}{lastElo - firstElo}
                            </Badge>
                        </div>
                    )
                }
            }
        },
        {
            key: "client",
            title: "Client",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { client } = item;
                return (
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        key={`client-${client.ID}`}
                        href={`${window.location.origin}/clients/search?ids=${client.ID}`}>
                            {client.ID}
                    </Button>
                )
            }
        }
    ];

    return (
        <>
        <Card className="player-table-card">
            <Card.Body>
                <Card.Title>Players</Card.Title>
                <Row className="filters-container mb-3">
                    <Col md={6} className="search-container">
                        <InputGroup>
                            <InputGroup.Text><FaMagnifyingGlass /></InputGroup.Text>
                            <Form.Control 
                                className="search-input"
                                placeholder="Search by name" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </Col>
                    <Col md={4} className="elo-filter-container">
                        <InputGroup>
                            <InputGroup.Text>ELO Range</InputGroup.Text>
                            <Form.Control 
                                className="elo-range-input"
                                placeholder="Min" 
                                value={eloMinFilter}
                                type="number"
                                onChange={(e) => setEloMinFilter(e.target.value)}
                            />
                            <Form.Control 
                                className="elo-range-input"
                                placeholder="Max" 
                                value={eloMaxFilter}
                                type="number"
                                onChange={(e) => setEloMaxFilter(e.target.value)}
                            />
                        </InputGroup>
                    </Col>
                    <Col md={2} className="sort-container">
                        <DropdownButton 
                            id="dropdown-sort" 
                            title={<><FaSort /> Sort</>}
                            variant="outline-secondary"
                            className="sort-dropdown"
                        >
                            <Dropdown.Item onClick={() => setSortType("elo-desc")}><FaSortDown /> ELO (High to Low)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setSortType("elo-asc")}><FaSortUp /> ELO (Low to High)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setSortType("win-percent-desc")}><FaSortDown /> Win % (High to Low)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setSortType("name-asc")}><FaSortUp /> Name (A-Z)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setSortType("name-desc")}><FaSortDown /> Name (Z-A)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setSortType("activity-desc")}><FaSortDown /> Most Active</Dropdown.Item>
                        </DropdownButton>
                    </Col>
                </Row>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">{filteredData.length} players</span>
                    <Button variant="outline-primary" size="sm" onClick={() => refreshData()}>Refresh</Button>
                </div>
                <DynamicTable data={filteredData} columns={columns} />
            </Card.Body>
        </Card>
        </>
    );
}
