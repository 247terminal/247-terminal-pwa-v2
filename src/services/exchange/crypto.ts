async function create_hmac_signature(secret: string, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const key_data = encoder.encode(secret);
    const message_data = encoder.encode(message);

    const crypto_key = await crypto.subtle.importKey(
        'raw',
        key_data,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    return crypto.subtle.sign('HMAC', crypto_key, message_data);
}

export async function hmac_sha256_hex(secret: string, message: string): Promise<string> {
    const signature = await create_hmac_signature(secret, message);
    const hash_array = Array.from(new Uint8Array(signature));

    return hash_array.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmac_sha256_base64(secret: string, message: string): Promise<string> {
    const signature = await create_hmac_signature(secret, message);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function get_timestamp(): number {
    return Date.now();
}

export function generate_nonce(): string {
    return crypto.randomUUID();
}
