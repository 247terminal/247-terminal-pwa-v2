import { config } from '@/config';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

let cached_key: CryptoKey | null = null;

async function get_crypto_key(): Promise<CryptoKey> {
    if (cached_key) return cached_key;

    const encoder = new TextEncoder();
    const key_material = encoder.encode(config.credentials_key.padEnd(32, '0').slice(0, 32));

    cached_key = await crypto.subtle.importKey('raw', key_material, { name: ALGORITHM }, false, [
        'encrypt',
        'decrypt',
    ]);

    return cached_key;
}

export async function encrypt(data: string): Promise<string> {
    if (!config.credentials_key) return data;

    try {
        const key = await get_crypto_key();
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const encoded = encoder.encode(data);

        const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch {
        return data;
    }
}

export async function decrypt(encrypted_data: string): Promise<string> {
    if (!config.credentials_key) return encrypted_data;

    try {
        const key = await get_crypto_key();
        const combined = Uint8Array.from(atob(encrypted_data), (c) => c.charCodeAt(0));

        const iv = combined.slice(0, IV_LENGTH);
        const data = combined.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);

        return new TextDecoder().decode(decrypted);
    } catch {
        return encrypted_data;
    }
}

export function is_encrypted(data: string): boolean {
    try {
        const decoded = atob(data);
        return decoded.length > IV_LENGTH;
    } catch {
        return false;
    }
}
