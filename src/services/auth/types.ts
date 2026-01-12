export interface User {
    membership_id: string | null;
    email: string | null;
    is_admin: boolean;
    is_global_key: boolean | null;
    status: string;
    expires_at: string;
}

export interface AuthResult {
    success: boolean;
    valid: boolean;
    token?: string;
    user?: User;
    error?: string;
    cached?: boolean;
}

export interface ValidateResponse {
    success: boolean;
    status: string;
    message: string;
    data: {
        valid: boolean;
        is_admin: boolean;
        is_global_key: boolean;
        email: string | null;
        membership_id: string | null;
        status: string | null;
        token?: string;
        user?: {
            email: string;
            membership_id: string;
            is_global_key: boolean;
            expires_at: string;
        };
        cached: boolean;
    };
}

export interface AuthState {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    user: User | null;
    error: string | null;
}

export interface JWTPayload {
    license_key: string;
    is_admin: boolean;
    membership_id: string | null;
    email: string | null;
    is_global_key: boolean | null;
    session_created: string;
    exp: number;
    iat: number;
}
