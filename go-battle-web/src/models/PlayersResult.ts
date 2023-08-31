import { ApiResult } from "./ApiResult";
import { ClientsResult } from "./ClientsResult";

export interface PlayersResult extends ApiResult {
    name: string;
    client: ClientsResult;
}
