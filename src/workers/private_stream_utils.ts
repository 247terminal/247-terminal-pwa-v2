import { STREAM_CONFIG } from '@/config';
import type { PrivateStreamState, StreamState } from '@/types/worker.types';

export const PrivateStreamStateEnum: Record<string, StreamState> = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
};

export function createPrivateStreamState(): PrivateStreamState {
    return {
        ws: null,
        state: 'disconnected',
        reconnectAttempts: 0,
        reconnectTimeout: null,
        pingInterval: null,
    };
}

export function calculateBackoff(attempt: number): number {
    const { backoffBase, backoffMax, backoffJitter } = STREAM_CONFIG;
    const delay = Math.min(backoffBase * Math.pow(2, attempt), backoffMax);
    return Math.floor(delay + delay * backoffJitter * (Math.random() * 2 - 1));
}

export function createWebSocket(url: string): WebSocket | null {
    try {
        return new WebSocket(url);
    } catch (e) {
        console.error('private websocket creation failed:', url, (e as Error).message);
        return null;
    }
}

export function safeClose(ws: WebSocket | null): void {
    if (!ws) return;
    try {
        ws.close();
    } catch (e) {
        console.error('websocket close error:', (e as Error).message);
    }
}

export function safeSend(ws: WebSocket | null, data: unknown): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('private websocket send error:', (e as Error).message);
        return false;
    }
}

export function cleanupState(state: PrivateStreamState): void {
    if (state.reconnectTimeout) {
        clearTimeout(state.reconnectTimeout);
        state.reconnectTimeout = null;
    }
    if (state.pingInterval) {
        clearInterval(state.pingInterval);
        state.pingInterval = null;
    }
    safeClose(state.ws);
    state.ws = null;
    state.state = 'disconnected';
    state.reconnectAttempts = 0;
}

export async function hmacSha256(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function hmacSha256Base64(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function hmacSha256HexBase64(message: string, secret: string): Promise<string> {
    const hex = await hmacSha256(message, secret);
    return btoa(hex);
}
