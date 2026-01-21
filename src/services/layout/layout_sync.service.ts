import { config } from '@/config';
import { get_auth_headers } from '@/services/auth/auth.service';
import type { RigsState, Rig } from '@/types/layout.types';

const LAYOUT_SYNC_DEBOUNCE = 3000;

let sync_timeout: ReturnType<typeof setTimeout> | null = null;
let last_synced: number | null = null;

export function get_last_synced(): number | null {
    return last_synced;
}

export async function sync_layouts_to_server(layouts: RigsState): Promise<boolean> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/layouts/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ layouts }),
        });

        if (response.ok) last_synced = Date.now();

        return response.ok;
    } catch {
        return false;
    }
}

export async function fetch_layouts_from_server(): Promise<RigsState | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/layouts/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        return result.data?.layouts || null;
    } catch {
        return null;
    }
}

export function debounced_sync_layouts(layouts: RigsState): void {
    if (sync_timeout) clearTimeout(sync_timeout);

    sync_timeout = setTimeout(() => {
        sync_layouts_to_server(layouts).catch(() => {});
    }, LAYOUT_SYNC_DEBOUNCE);
}

export function merge_layouts(local: RigsState, server: RigsState): RigsState {
    const merged_rigs: Record<string, Rig> = { ...local.rigs };

    for (const [id, server_rig] of Object.entries(server.rigs)) {
        const local_rig = local.rigs[id];

        if (!local_rig) {
            merged_rigs[id] = server_rig;
            continue;
        }

        const server_updated = server_rig.updated_at ?? server_rig.created_at;
        const local_updated = local_rig.updated_at ?? local_rig.created_at;

        if (server_updated > local_updated) merged_rigs[id] = server_rig;
    }

    return {
        rigs: merged_rigs,
        active_rig_id: local.active_rig_id,
    };
}

export function cancel_pending_sync(): void {
    if (sync_timeout) {
        clearTimeout(sync_timeout);
        sync_timeout = null;
    }
}
