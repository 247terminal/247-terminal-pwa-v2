import { signal } from '@preact/signals';

const STORAGE_KEY = '247terminal_layout_locked';

function load_from_storage(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'true';
    } catch {
        return false;
    }
}

function save_to_storage(locked: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(locked));
    } catch (e) {
        console.error('Failed to save layout lock state:', e);
    }
}

export const layout_locked = signal<boolean>(load_from_storage());
export const lock_shake = signal<number>(0);

export function toggle_layout_lock(): void {
    layout_locked.value = !layout_locked.value;
    save_to_storage(layout_locked.value);
}

export function set_layout_lock(locked: boolean): void {
    layout_locked.value = locked;
    save_to_storage(locked);
}

export function trigger_lock_shake(): void {
    lock_shake.value = Date.now();
}
