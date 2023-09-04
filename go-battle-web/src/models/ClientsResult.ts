import { ApiResult } from "./ApiResult";

export interface ClientsResult extends ApiResult {
    repo: string;
    language: string;
    game: string;
}
