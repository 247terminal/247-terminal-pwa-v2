import { signal } from '@preact/signals';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface ConnectionStatus {
    state: ConnectionState;
    message?: string;
}

const initial_status: ConnectionStatus = {
    state: 'disconnected',
    message: 'Not connected',
};

export const connection_status = signal<ConnectionStatus>(initial_status);

export function set_connection_state(state: ConnectionState, message?: string): void {
    connection_status.value = { state, message };
}

export function connect(): void {
    set_connection_state('connecting', 'Connecting...');
}

export function connected(message?: string): void {
    set_connection_state('connected', message || 'Connected');
}

export function disconnect(message?: string): void {
    set_connection_state('disconnected', message || 'Disconnected');
}
