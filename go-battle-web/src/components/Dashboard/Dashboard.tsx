import { FC, useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { ApiResult } from '../../models/ApiResult';
import { PlayersResult } from '../../models/PlayersResult';
import { MatchesResult } from '../../models/MatchesResult';
import { GamesResult } from '../../models/GamesResult';
import { average, elapsedTime, getApiUrl, prettyTimeAgo } from '../../utils/utils';
import EloBadge from '../Common/ELO/ELOBadge';
import styles from './Dashboard.module.css';

interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
    let [players, setPlayers] = useState<PlayersResult[]>([]);
    let [topFivePlayers, setTopFivePlayers] = useState<PlayersResult[]>([]);
    let [matches, setMatches] = useState<MatchesResult[]>([]);
    let [games, setGames] = useState<GamesResult[]>([]);
    let [avgMatchLength, setAvgMatchLength] = useState<number>(0);

    const apiUrl = getApiUrl();

    useEffect(() => {
        fetchFromApi("/games");
        fetchFromApi("/matches");
        fetchFromApi("/players");
    }, []);

    // set Top 5 Players when players changes
    useEffect(() => {
        let sortedPlayers = [...players].sort((a, b) => a.elo > b.elo ? -1 : a.elo < b.elo ? 1 : 0);
        setTopFivePlayers(sortedPlayers.slice(0, 5));
    }, [players]);

    // update match stats when matches changes
    useEffect(() => {
        if (matches.length > 0) {
            let matchElapsedTimes = matches.filter((m) => elapsedTime(m.start_time, m.end_time) > 0).map((m) => {
                return  elapsedTime(m.start_time, m.end_time);
            });
    
            setAvgMatchLength(average(matchElapsedTimes));
        }


    }, [matches]);

    const fetchFromApi = (path: string) => {
        let url = `${apiUrl}${path}`;

        fetch(url, {mode:'cors'})
          .then(response => response.json())
          .then((json: ApiResult[]) => {
            if(path.includes("players")) {
                setPlayers(json as PlayersResult[]);
            }
            else if(path.includes("games")) {
                setGames(json as GamesResult[]);
            }
            else if(path.includes("matches")) {
                setMatches(json as MatchesResult[]);
            }
          })
          .catch(error => console.error(error))
    }

    return (
        <Container>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Players</div>
                    <div className={styles.statValue}>{players.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Matches</div>
                    <div className={styles.statValue}>{matches.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Games</div>
                    <div className={styles.statValue}>{games.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Avg Match Length</div>
                    <div className={styles.statValue}>{prettyTimeAgo(avgMatchLength)}</div>
                </div>
            </div>

            <div className={styles.leaderboard}>
                <div className={styles.leaderboardHeader}>Top 5 Players</div>
                {topFivePlayers.map((p, i) => (
                    <div className={styles.leaderboardRow} key={`top5-${p.ID}`}>
                        <span className={styles.rank}>{i + 1}</span>
                        <span className={styles.playerName}>{p.name}</span>
                        <EloBadge elo={p.elo} eloHistory={p.elo_history} />
                    </div>
                ))}
            </div>
        </Container>
    )
}

export default Dashboard;
