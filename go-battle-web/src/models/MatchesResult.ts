import { GamesResult } from "./GamesResult";
import { PlayersResult } from "./PlayersResult";

export interface MatchesResult {
    ID: number;
    id: number;
    CreatedAt: Date;
    UpdatedAt: Date;
    DeletedAt: Date;
    numGames: number;
    games: GamesResult[];
    players: PlayersResult[];
    status: string;
}
