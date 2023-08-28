import { ClientsResult } from "./ClientsResult";

export interface PlayersResult {
    ID: number;
    CreatedAt: Date;
    UpdatedAt: Date;
    DeletedAt: Date;
    name: string;
    client: ClientsResult;
}
