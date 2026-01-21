import { config } from '@/config';
import { get_auth_headers } from '@/services/auth/auth.service';
import type { UserSettings, EncryptedSettings } from '@/types/settings.types';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from './settings.constants';

export async function encrypt_settings(settings: UserSettings): Promise<EncryptedSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ settings: JSON.stringify(settings) }),
        });

        if (!response.ok) return null;

        const result = await response.json();
        const encrypted = result.data.encrypted;

        return {
            iv: encrypted.iv,
            auth_tag: encrypted.auth_tag || encrypted.authTag,
            data: encrypted.data,
        };
    } catch {
        return null;
    }
}

export async function decrypt_settings(encrypted: EncryptedSettings): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({
                encrypted: {
                    iv: encrypted.iv,
                    auth_tag: encrypted.auth_tag,
                    data: encrypted.data,
                },
            }),
        });

        if (!response.ok) return null;

        const result = await response.json();
        return JSON.parse(result.data.decrypted);
    } catch {
        return null;
    }
}

export async function sync_to_server(settings: UserSettings): Promise<boolean> {
    try {
        const encrypted = await encrypt_settings(settings);
        if (!encrypted) return false;

        const response = await fetch(`${config.api_base_url}/v1/app/settings/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ settings: encrypted }),
        });

        return response.ok;
    } catch {
        return false;
    }
}

export async function fetch_from_server(): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        if (!result.data?.settings) return null;

        return await decrypt_settings(result.data.settings as EncryptedSettings);
    } catch {
        return null;
    }
}

export function load_from_storage(): UserSettings | null {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

export function save_to_storage(settings: UserSettings): boolean {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch {
        return false;
    }
}

export function merge_settings(local: UserSettings, server: UserSettings): UserSettings {
    return { ...DEFAULT_SETTINGS, ...server, ...local };
}