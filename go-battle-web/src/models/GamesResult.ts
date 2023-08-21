export interface GamesResult {
    ID: number;
    CreatedAt: Date;
    UpdatedAt: Date;
    DeletedAt: Date;
    players: number[];
    winner: number;
    loser: number;
    match: number;
}
