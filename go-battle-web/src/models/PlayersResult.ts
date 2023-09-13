import { ApiResult } from "./ApiResult";
import { ClientsResult } from "./ClientsResult";
import { GamesResult } from "./GamesResult";
import { HistoricalElo } from "./HistoricalElo";

export interface PlayersResult extends ApiResult {
    name: string;
    client: ClientsResult;
    elo: number;
    elo_history: HistoricalElo[];
    games: GamesResult[];
}
