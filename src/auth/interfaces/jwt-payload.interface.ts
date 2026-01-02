export interface JwtPayload {
    sub: string;          // staff UUID
    employeeId: string;   // employee identifier
    email: string;
    role: 'STAFF' | 'ADMIN';
    iat?: number;
    exp?: number;
}

export interface CurrentUser {
    id: string;
    employeeId: string;
    email: string;
    role: 'STAFF' | 'ADMIN';
}
