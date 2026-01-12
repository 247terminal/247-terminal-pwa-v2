import type { JWTPayload } from "./types";

const TOKEN_KEY = '247_session_token';

export function save_token(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function get_token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clear_token(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function decode_jwt_payload(token: string): JWTPayload | null {
    try {
        const base64_payload = token.split('.')[1];
        const payload = atob(base64_payload);
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

export function is_token_expired(token: string): boolean | null {
    const payload = decode_jwt_payload(token);
    if (!payload || typeof payload.exp !== 'number') return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}

export function get_token_expiry(token: string): Date | null {
    const payload = decode_jwt_payload(token);
    if (!payload || typeof payload.exp !== 'number') return null;
    return new Date(payload.exp * 1000);
}
