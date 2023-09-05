import { ApiResult } from "./ApiResult";
import { ClientsResult } from "./ClientsResult";
import { HistoricalElo } from "./HistoricalElo";

export interface PlayersResult extends ApiResult {
    name: string;
    client: ClientsResult;
    elo: number;
    elo_history: HistoricalElo[];
}
