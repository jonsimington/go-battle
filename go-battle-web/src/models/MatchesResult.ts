import { ApiResult } from "./ApiResult";
import { GamesResult } from "./GamesResult";
import { PlayersResult } from "./PlayersResult";

export interface MatchesResult extends ApiResult {
    numGames: number;
    games: GamesResult[];
    players: PlayersResult[];
    status: string;
}
