import { signal, computed } from '@preact/signals';
import type { UserSettings, SettingsState } from '@/types/settings.types';
import {
    load_from_storage,
    save_to_storage,
    sync_to_server,
    fetch_from_server,
    merge_settings,
} from '@/services/settings/settings.service';
import { DEFAULT_SETTINGS, SETTINGS_SYNC_DEBOUNCE } from '@/services/settings/settings.constants';

export const settings_state = signal<SettingsState>({
    status: 'loading',
    settings: null,
    error: null,
    last_synced: null,
});

export const settings = computed(() => settings_state.value.settings ?? DEFAULT_SETTINGS);
export const settings_status = computed(() => settings_state.value.status);

let sync_timeout: ReturnType<typeof setTimeout> | null = null;

function debounced_sync(new_settings: UserSettings): void {
    if (sync_timeout) clearTimeout(sync_timeout);

    sync_timeout = setTimeout(async () => {
        settings_state.value = { ...settings_state.value, status: 'saving' };

        const success = await sync_to_server(new_settings);

        settings_state.value = {
            ...settings_state.value,
            status: success ? 'ready' : 'error',
            error: success ? null : 'failed to sync settings',
            last_synced: success ? Date.now() : settings_state.value.last_synced,
        };
    }, SETTINGS_SYNC_DEBOUNCE);
}

function resolve_settings(local: UserSettings | null, server: UserSettings | null): UserSettings {
    if (local && server) return merge_settings(local, server);
    if (server) return server;
    if (local) return local;
    return DEFAULT_SETTINGS;
}

export async function init_settings(): Promise<void> {
    const local = load_from_storage();
    const server = await fetch_from_server();
    const final_settings = resolve_settings(local, server);

    save_to_storage(final_settings);

    settings_state.value = {
        status: 'ready',
        settings: final_settings,
        error: null,
        last_synced: server ? Date.now() : null,
    };
}

export function update_settings<K extends keyof UserSettings>(
    section: K,
    updates: Partial<UserSettings[K]>
): void {
    const current = settings_state.value.settings ?? DEFAULT_SETTINGS;
    const current_section = current[section];
    const new_settings: UserSettings = {
        ...current,
        [section]: { ...(current_section as object), ...(updates as object) },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: new_settings,
    };

    save_to_storage(new_settings);
    debounced_sync(new_settings);
}

export function set_setting<K extends keyof UserSettings>(
    section: K,
    key: keyof UserSettings[K],
    value: UserSettings[K][keyof UserSettings[K]]
): void {
    const current = settings_state.value.settings ?? DEFAULT_SETTINGS;
    const current_section = current[section];
    const new_settings: UserSettings = {
        ...current,
        [section]: { ...(current_section as object), [key]: value },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: new_settings,
    };

    save_to_storage(new_settings);
    debounced_sync(new_settings);
}

export function reset_settings(): void {
    settings_state.value = {
        status: 'ready',
        settings: DEFAULT_SETTINGS,
        error: null,
        last_synced: null,
    };

    save_to_storage(DEFAULT_SETTINGS);
    debounced_sync(DEFAULT_SETTINGS);
}
