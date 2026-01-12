import type { AuthResult, ValidateResponse, User } from "./types";
import { save_token, get_token, clear_token, is_token_expired, decode_jwt_payload } from "./session.service";

const API_BASE = import.meta.env.VITE_API_URL || '';

function failed_response(error: string) {
    return {
        success: false,
        valid: false,
        error: error
    }
}

export async function validate_license(license_key: string): Promise<AuthResult> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/license/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key })
        });
        if (response.status === 429) return failed_response('too many attempts');

        const result: ValidateResponse = await response.json();
        if (!result.data.valid) return failed_response(result.message || 'invalid license key');

        const token = result.data.token;
        if (token) save_token(token);

        const data = result.data;

        const user: User = {
            membership_id: data.membership_id, 
            email: data.email, 
            is_admin: data.is_admin, 
            is_global_key: data.is_global_key, 
            status: data.status || '', 
            expires_at: data.user?.expires_at || ''
        };

        return { success: true, valid: true, token, user };

    } catch (error) {
        return {
            success: false,
            valid: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

export function check_existing_session(): { valid: boolean; user: User | null } {
    const token = get_token();
    if (!token) return { valid: false, user: null };
    
    if (is_token_expired(token)) {
        clear_token();
        return { valid: false, user: null };
    }

    const payload = decode_jwt_payload(token);
    if (!payload) {
        clear_token();
        return { valid: false, user: null };
    }

    const user: User = {
        membership_id: payload.membership_id,
        email: payload.email,
        is_admin: payload.is_admin,
        is_global_key: payload.is_global_key,
        status: 'active',
        expires_at: '',
    };

    return { valid: true, user };
}

export function logout(): void {
    clear_token();
}

export function get_auth_headers(): Record<string, string> {
    const token = get_token();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
}
