export interface JwtPayload {
    sub: string;          // staff UUID
    email: string;
    role: 'STAFF' | 'ADMIN';
    iat?: number;
    exp?: number;
}

export interface CurrentUser {
    id: string;
    email: string;
    role: 'STAFF' | 'ADMIN';
}
