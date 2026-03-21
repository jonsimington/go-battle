import { FC, useEffect, useMemo, useState } from 'react';
import { Container } from 'react-bootstrap';
import { PlayersResult } from '../../models/PlayersResult';
import { MatchesResult } from '../../models/MatchesResult';
import { GamesResult } from '../../models/GamesResult';
import { average, elapsedTime, getApiUrl, prettyTimeAgo } from '../../utils/utils';
import EloBadge from '../Common/ELO/ELOBadge';
import styles from './Dashboard.module.css';

const apiUrl = getApiUrl();

const Dashboard: FC = () => {
    const [players, setPlayers] = useState<PlayersResult[]>([]);
    const [matches, setMatches] = useState<MatchesResult[]>([]);
    const [games, setGames] = useState<GamesResult[]>([]);

    useEffect(() => {
        Promise.all([
            fetch(`${apiUrl}/players`, { mode: 'cors' }).then(r => r.json()),
            fetch(`${apiUrl}/matches`, { mode: 'cors' }).then(r => r.json()),
            fetch(`${apiUrl}/games`, { mode: 'cors' }).then(r => r.json()),
        ])
            .then(([playersData, matchesData, gamesData]) => {
                setPlayers(playersData as PlayersResult[]);
                setMatches(matchesData as MatchesResult[]);
                setGames(gamesData as GamesResult[]);
            })
            .catch(error => console.error(error));
    }, []);

    // Derive top 5 players during render instead of via useEffect
    const topFivePlayers = useMemo(
        () => [...players].sort((a, b) => b.elo - a.elo).slice(0, 5),
        [players]
    );

    // Derive avg match length during render instead of via useEffect
    const avgMatchLength = useMemo(() => {
        if (matches.length === 0) return 0;
        const times = matches
            .map(m => elapsedTime(m.start_time, m.end_time))
            .filter(t => t > 0);
        return average(times);
    }, [matches]);

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
    );
};

export default Dashboard;
