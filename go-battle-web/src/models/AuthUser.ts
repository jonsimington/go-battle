export interface AuthUser {
    ID: number;
    username: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}
