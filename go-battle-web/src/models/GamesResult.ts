import { MatchesResult } from "./MatchesResult";
import { PlayersResult } from "./PlayersResult";

export interface GamesResult {
    ID: number;
    CreatedAt: Date;
    UpdatedAt: Date;
    DeletedAt: Date;
    players: PlayersResult[];
    winner: PlayersResult;
    loser: PlayersResult;
    match: MatchesResult;
    session_id: number;
	gamelog_url: string;
}
