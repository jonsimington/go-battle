import { ApiResult } from "./ApiResult";
import { GamesResult } from "./GamesResult";
import { MatchesResult } from "./MatchesResult";
import { PlayersResult } from "./PlayersResult";

export interface TournamentsResult extends ApiResult {
    name: string;
    players: PlayersResult[];
    games: GamesResult[];
    matches: MatchesResult[];
    winner: PlayersResult;
    type: string;
    start_time: Date;
    end_time: Date;
    status: string;
}
