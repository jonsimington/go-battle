import { DynamicTable, IColumnType } from '../../DynamicTable/DynamicTable';
import { PlayersResult } from '../../../models/PlayersResult';
import { useMemo, useState } from 'react';
import { Button, Badge, Card, Form, InputGroup, Row, Col, Dropdown, DropdownButton, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { calculateGameResult, calculateStreak, pluck } from '../../../utils/utils';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { FaMagnifyingGlass, FaSort, FaSortDown, FaSortUp, FaMedal, FaTrophy, FaFire } from 'react-icons/fa6';
import EloBadge from '../../Common/ELO/ELOBadge';
import { Link, useNavigate } from 'react-router-dom';
import './SearchPlayers.css';

interface SearchPlayersProps {
    tableData: any[],
    refreshData: Function,
}

// Pure function hoisted outside component — no re-creation each render
const calculateWinPercentage = (player: PlayersResult): number => {
    const games = player.games || [];
    let wins = 0;
    let draws = 0;
    let total = 0;
    for (const g of games) {
        if (g.status !== "Complete") continue;
        total++;
        if ((g.winner_id || g.winner?.ID) === player.ID) wins++;
        if (g.draw) draws++;
    }
    return total > 0 ? ((2 * wins + draws) / (2 * total) * 100) : 0;
};

// Count wins/losses/draws in a single pass instead of 3 separate filter calls
const countGameResults = (games: any[], playerID: number) => {
    let wins = 0, losses = 0, draws = 0, total = 0;
    for (const g of games) {
        if (g.status !== "Complete") continue;
        total++;
        if (g.draw) { draws++; continue; }
        if ((g.winner_id || g.winner?.ID) === playerID) wins++;
        else if ((g.loser_id || g.loser?.ID) === playerID) losses++;
    }
    return { wins, losses, draws, total };
};

export function SearchPlayers({ tableData, refreshData }: SearchPlayersProps): JSX.Element {
    const [sortType, setSortType] = useState("elo-desc");
    const [searchTerm, setSearchTerm] = useState("");
    const [eloMinFilter, setEloMinFilter] = useState("");
    const [eloMaxFilter, setEloMaxFilter] = useState("");

    const navigate = useNavigate();

    // Derive sorted + filtered data during render via useMemo instead of useEffect chains
    const filteredData = useMemo(() => {
        let result = [...tableData] as PlayersResult[];

        // Sort
        if (sortType === "created") {
            result.sort((a, b) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0);
        } else if (sortType === "created-desc") {
            result.sort((a, b) => a.CreatedAt > b.CreatedAt ? -1 : a.CreatedAt < b.CreatedAt ? 1 : 0);
        } else if (sortType === "elo-desc") {
            result.sort((a, b) => b.elo - a.elo);
        } else if (sortType === "elo-asc") {
            result.sort((a, b) => a.elo - b.elo);
        } else if (sortType === "name-asc") {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortType === "name-desc") {
            result.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortType === "win-percent-desc") {
            result.sort((a, b) => calculateWinPercentage(b) - calculateWinPercentage(a));
        } else if (sortType === "activity-desc") {
            result.sort((a, b) => (b.games || []).length - (a.games || []).length);
        }

        // Filter by search term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(player => player.name.toLowerCase().includes(lower));
        }

        // Filter by ELO range
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

        return result;
    }, [tableData, sortType, searchTerm, eloMinFilter, eloMaxFilter]);

    const renderRankBadge = (index: number) => {
        if (index === 0) return <FaTrophy className="text-warning" title="Top Ranked Player" />;
        if (index === 1) return <FaMedal className="text-light" title="2nd Place" />;
        if (index === 2) return <FaMedal className="text-orange" title="3rd Place" style={{color: '#f78166'}} />;
        return null;
    };

    const renderPlayerActivity = (games: any[]) => {
        if (!games) return null;
        const recentGames = [...games.filter(g => g.status === "Complete")]
                               .sort((a: any, b: any) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0)
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
                    <div className="player-name-cell">
                        <div className="player-card">
                            <span className="player-name">{name}</span>
                            {renderPlayerActivity(games)}
                            <span className="player-links">
                                <Link to={`/games/search?players=${ID}`} className="player-link">Games</Link>
                                <Link to={`/matches/search?players=${ID}`} className="player-link">Matches</Link>
                            </span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: "wins",
            title: "W / L / D",
            width: 160,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { ID } = item;
                const { wins, losses, draws, total } = countGameResults(item.games || [], ID);
                const wPct = total > 0 ? (wins / total) * 100 : 0;
                const lPct = total > 0 ? (losses / total) * 100 : 0;
                const dPct = total > 0 ? (draws / total) * 100 : 0;

                return (
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id={`tooltip-${ID}-stats`}>
                                {total} games: {wins}W / {losses}L / {draws}D
                            </Tooltip>
                        }
                    >
                        <div className="wld-cell">
                            <div className="wld-numbers">
                                <span className="wld-w">{wins}</span>
                                <span className="wld-sep">/</span>
                                <span className="wld-l">{losses}</span>
                                <span className="wld-sep">/</span>
                                <span className="wld-d">{draws}</span>
                            </div>
                            <div className="wld-bar">
                                <div className="wld-bar-w" style={{ width: `${wPct}%` }} />
                                <div className="wld-bar-l" style={{ width: `${lPct}%` }} />
                                <div className="wld-bar-d" style={{ width: `${dPct}%` }} />
                            </div>
                        </div>
                    </OverlayTrigger>
                );
            }
        },
        {
            key: "streak",
            title: "Streak",
            width: 80,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { ID } = item;
                const safeGames = item.games || [];
                const sortedGames = [...safeGames.filter(g => g.status === "Complete")]
                    .sort((a: any, b: any) => a.UpdatedAt > b.UpdatedAt ? -1 : a.UpdatedAt < b.UpdatedAt ? 1 : 0);
                const { streakType, streakCount } = calculateStreak(sortedGames, ID);
                
                if (streakCount === 0) {
                    return <span className="streak-none">—</span>;
                }

                const label = streakType === "win" ? "W" : streakType === "lose" ? "L" : "D";
                const cls = streakType === "win" ? "streak-win" : streakType === "lose" ? "streak-lose" : "streak-draw";
                
                return (
                    <span className={`streak-badge ${cls}`}>
                        {streakCount}{label}
                        {streakType === "win" && streakCount >= 3 ? <FaFire className="streak-fire" /> : null}
                    </span>
                );
            }
        },
        {
            key: "win_percent",
            title: "Win %",
            width: 80,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { wins, draws, total } = countGameResults(item.games || [], item.ID);
                if (total === 0) return <span className="streak-none">—</span>;
                const winPercent = Math.round(((2 * wins + draws) / (2 * total)) * 1000) / 10;

                const cls = winPercent >= 60 ? 'wp-high' : winPercent >= 45 ? 'wp-mid' : 'wp-low';
                return <span className={`win-pct ${cls}`}>{winPercent.toFixed(1)}%</span>;
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
                );
            }
        },
        {
            key: "elo_history",
            title: "ELO History",
            width: 200,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const elo_history = item.elo_history || [];
                if (elo_history.length === 0) {
                    return "No History Yet";
                }
                else if (elo_history.length < 3) {
                    return "Not Enough History";
                }
                else {
                    // Use spread + sort to avoid mutating the original array during render
                    const sortedHistory = [...elo_history].sort((a: any, b: any) => a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : 0);
                    const sortedElos = sortedHistory.map(pluck('elo'));

                    const firstElo = sortedElos[0];
                    const lastElo = sortedElos[sortedElos.length - 1];
                    const sparklineColor = firstElo < lastElo ? "#3fb950" : "#f85149";

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
                    );
                }
            }
        },
        {
            key: "client",
            title: "Client",
            width: 100,
            render: (column: IColumnType<PlayersResult>, item: PlayersResult) => {
                const { client } = item;
                if (!client) return <span>—</span>;
                return (
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        key={`client-${client.ID}`}
                        onClick={() => navigate(`/clients/search?ids=${client.ID}`)}>
                            {client.ID}
                    </Button>
                );
            }
        }
    ];

    return (
        <>
        <Card className="player-table-card">
            <Card.Body>
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
                </div>
                <DynamicTable
                    data={filteredData}
                    columns={columns}
                    onRowClick={(player: PlayersResult) => navigate(`/players/${player.ID}`)}
                />
            </Card.Body>
        </Card>
        </>
    );
}
