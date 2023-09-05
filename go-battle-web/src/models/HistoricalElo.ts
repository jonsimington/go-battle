import { ApiResult } from "./ApiResult";

export interface HistoricalElo extends ApiResult {
    elo: number;
    timestamp: Date;
}
