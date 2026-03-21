import { ApiResult } from "./ApiResult";
import { MatchesResult } from "./MatchesResult";
import { PlayersResult } from "./PlayersResult";

export interface GamesResult extends ApiResult {
    players: PlayersResult[];
    winner: PlayersResult;
    loser: PlayersResult;
    match: MatchesResult;
    match_id: number;
    session_id: number;
	gamelog_url: string;
    draw: boolean;
    status: string;
    error_message: string;
    winner_id: number;
    loser_id: number;
}
