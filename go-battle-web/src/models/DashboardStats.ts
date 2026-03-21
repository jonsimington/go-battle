export interface LeaderboardEntry {
    id: number;
    name: string;
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    total_games: number;
    elo_trend: number;
}

export interface RecentMatch {
    id: number;
    status: string;
    player1: string;
    player1_id: number;
    player2: string;
    player2_id: number;
    num_games: number;
    draw: boolean;
    start_time: string;
    end_time: string;
}

export interface ActiveTournamentSummary {
    id: number;
    name: string;
    status: string;
    type: string;
    player_count: number;
    match_count: number;
    current_round: number;
}

export interface EloBucket {
    label: string;
    min: number;
    max: number;
    count: number;
}

export interface DashboardStats {
    player_count: number;
    match_count: number;
    game_count: number;
    tournament_count: number;
    matches_by_status: Record<string, number>;
    games_by_status: Record<string, number>;
    avg_match_duration_ms: number;
    top_players: LeaderboardEntry[];
    recent_matches: RecentMatch[];
    active_tournaments: ActiveTournamentSummary[];
    elo_distribution: EloBucket[];
}
