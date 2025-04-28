import { HistoricalElo } from "./HistoricalElo";

export interface PlayerScore {
    name: string;
    id: number;
    wins: number;
    losses: number;
    draws: number;
    elo: number;
    elo_history: HistoricalElo[];
}
