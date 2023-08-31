import { ApiResult } from "./ApiResult";
import { MatchesResult } from "./MatchesResult";
import { PlayersResult } from "./PlayersResult";

export interface GamesResult extends ApiResult {
    players: PlayersResult[];
    winner: PlayersResult;
    loser: PlayersResult;
    match: MatchesResult;
    session_id: number;
	gamelog_url: string;
}
