import { signal, computed } from '@preact/signals';
import type { Block, BlockType, BlockLayout, Rig, RigsState } from '../types/layout.types';
import { BLOCK_DEFAULTS } from '../types/layout.types';

const STORAGE_KEY = '247terminal_rigs';

function generate_id(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function create_empty_rig(name: string): Rig {
    return {
        id: generate_id(),
        name,
        blocks: [],
        layouts: {
            lg: [],
        },
        created_at: Date.now(),
    };
}

export type DefaultRigTemplate = 'single_chart' | 'double_chart';

function create_single_chart_rig(): Rig {
    const chart_id = `chart_${generate_id()}`;
    const news_id = `news_${generate_id()}`;
    const positions_id = `positions_${generate_id()}`;
    const trade_id = `trade_${generate_id()}`;

    return {
        id: generate_id(),
        name: 'SINGLE CHART',
        blocks: [
            { id: chart_id, type: 'chart' },
            { id: news_id, type: 'news' },
            { id: positions_id, type: 'positions' },
            { id: trade_id, type: 'trade' },
        ],
        layouts: {
            lg: [
                { i: chart_id, x: 0, y: 0, w: 12, h: 10, minW: 4, minH: 4 },
                { i: news_id, x: 12, y: 0, w: 4, h: 16, minW: 2, minH: 3 },
                { i: positions_id, x: 0, y: 10, w: 6, h: 6, minW: 3, minH: 3 },
                { i: trade_id, x: 6, y: 10, w: 6, h: 6, minW: 2, minH: 4 },
            ],
        },
        created_at: Date.now(),
    };
}

function create_double_chart_rig(): Rig {
    const chart1_id = `chart_${generate_id()}`;
    const chart2_id = `chart_${generate_id()}`;
    const news_id = `news_${generate_id()}`;
    const positions_id = `positions_${generate_id()}`;
    const trade_id = `trade_${generate_id()}`;

    return {
        id: generate_id(),
        name: 'DOUBLE CHART',
        blocks: [
            { id: chart1_id, type: 'chart' },
            { id: chart2_id, type: 'chart' },
            { id: news_id, type: 'news' },
            { id: positions_id, type: 'positions' },
            { id: trade_id, type: 'trade' },
        ],
        layouts: {
            lg: [
                { i: chart1_id, x: 0, y: 0, w: 6, h: 9, minW: 3, minH: 4 },
                { i: chart2_id, x: 6, y: 0, w: 6, h: 9, minW: 3, minH: 4 },
                { i: news_id, x: 12, y: 0, w: 4, h: 16, minW: 2, minH: 3 },
                { i: positions_id, x: 0, y: 9, w: 6, h: 7, minW: 3, minH: 3 },
                { i: trade_id, x: 6, y: 9, w: 6, h: 7, minW: 2, minH: 4 },
            ],
        },
        created_at: Date.now() + 1,
    };
}

export function create_rig_from_template(template: DefaultRigTemplate): string {
    const new_rig = template === 'single_chart'
        ? create_single_chart_rig()
        : create_double_chart_rig();

    const state = rigs_state.value;
    const new_state: RigsState = {
        rigs: {
            ...state.rigs,
            [new_rig.id]: new_rig,
        },
        active_rig_id: new_rig.id,
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);

    return new_rig.id;
}

function load_from_storage(): RigsState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load rigs from storage:', e);
    }
    return null;
}

function save_to_storage(state: RigsState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save rigs to storage:', e);
    }
}

function get_default_state(): RigsState {
    const single_chart = create_single_chart_rig();
    const double_chart = create_double_chart_rig();
    return {
        rigs: {
            [single_chart.id]: single_chart,
            [double_chart.id]: double_chart,
        },
        active_rig_id: single_chart.id,
    };
}

function migrate_old_layout(): RigsState | null {
    try {
        const old_stored = localStorage.getItem('247terminal_layout');
        if (old_stored) {
            const old_state = JSON.parse(old_stored);
            const migrated_rig: Rig = {
                id: generate_id(),
                name: 'DEFAULT',
                blocks: old_state.blocks || [],
                layouts: { lg: old_state.layouts?.lg || [] },
                created_at: Date.now(),
            };
            localStorage.removeItem('247terminal_layout');
            return {
                rigs: { [migrated_rig.id]: migrated_rig },
                active_rig_id: migrated_rig.id,
            };
        }
    } catch (e) {
        console.error('Failed to migrate old layout:', e);
    }
    return null;
}

const initial_state = load_from_storage() || migrate_old_layout() || get_default_state();

export const rigs_state = signal<RigsState>(initial_state);

export const active_rig = computed(() => {
    const state = rigs_state.value;
    return state.rigs[state.active_rig_id];
});

export const all_rigs = computed(() => {
    return Object.values(rigs_state.value.rigs).sort((a, b) => a.created_at - b.created_at);
});

export const blocks = computed(() => active_rig.value?.blocks || []);
export const layouts = computed(() => active_rig.value?.layouts || { lg: [] });

function check_overlap(x: number, y: number, w: number, h: number, layouts: BlockLayout[]): boolean {
    for (const item of layouts) {
        const overlaps_x = x < item.x + item.w && x + w > item.x;
        const overlaps_y = y < item.y + item.h && y + h > item.y;
        if (overlaps_x && overlaps_y) {
            return true;
        }
    }
    return false;
}

function find_next_position(layouts: BlockLayout[], block_w: number, block_h: number, cols: number = 12): { x: number; y: number } {
    if (layouts.length === 0) {
        return { x: 0, y: 0 };
    }

    let max_bottom = 0;
    for (const item of layouts) {
        const bottom = item.y + item.h;
        if (bottom > max_bottom) {
            max_bottom = bottom;
        }
    }

    for (let y = 0; y <= max_bottom; y++) {
        for (let x = 0; x <= cols - block_w; x++) {
            if (!check_overlap(x, y, block_w, block_h, layouts)) {
                return { x, y };
            }
        }
    }

    return { x: 0, y: max_bottom };
}

function update_active_rig(updater: (rig: Rig) => Rig): void {
    const state = rigs_state.value;
    const active = state.rigs[state.active_rig_id];
    if (!active) return;

    const updated_rig = updater(active);
    const new_state: RigsState = {
        ...state,
        rigs: {
            ...state.rigs,
            [state.active_rig_id]: updated_rig,
        },
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);
}

export function add_block(type: BlockType): string {
    const id = `block_${generate_id()}`;
    const defaults = BLOCK_DEFAULTS[type];
    const current_layouts = active_rig.value?.layouts.lg || [];
    const position = find_next_position(current_layouts, defaults.w, defaults.h);

    const new_block: Block = { id, type };
    const new_layout: BlockLayout = {
        i: id,
        x: position.x,
        y: position.y,
        w: defaults.w,
        h: defaults.h,
        minW: defaults.minW,
        minH: defaults.minH,
    };

    update_active_rig((rig) => ({
        ...rig,
        blocks: [...rig.blocks, new_block],
        layouts: {
            ...rig.layouts,
            lg: [...rig.layouts.lg, new_layout],
        },
    }));

    return id;
}

export function remove_block(id: string): void {
    update_active_rig((rig) => ({
        ...rig,
        blocks: rig.blocks.filter(b => b.id !== id),
        layouts: {
            ...rig.layouts,
            lg: rig.layouts.lg.filter(l => l.i !== id),
        },
    }));
}

export function update_layouts(new_layouts: { lg: BlockLayout[] }): void {
    update_active_rig((rig) => ({
        ...rig,
        layouts: new_layouts,
    }));
}

export function create_rig(name: string): string {
    const new_rig = create_empty_rig(name);
    const state = rigs_state.value;

    const new_state: RigsState = {
        rigs: {
            ...state.rigs,
            [new_rig.id]: new_rig,
        },
        active_rig_id: new_rig.id,
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);

    return new_rig.id;
}

export function delete_rig(id: string): boolean {
    const state = rigs_state.value;
    const rig_ids = Object.keys(state.rigs);

    if (rig_ids.length <= 1) {
        return false;
    }

    const { [id]: removed, ...remaining_rigs } = state.rigs;
    const new_active_id = id === state.active_rig_id
        ? Object.keys(remaining_rigs)[0]
        : state.active_rig_id;

    const new_state: RigsState = {
        rigs: remaining_rigs,
        active_rig_id: new_active_id,
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);

    return true;
}

export function rename_rig(id: string, new_name: string): void {
    const state = rigs_state.value;
    const rig = state.rigs[id];
    if (!rig) return;

    const new_state: RigsState = {
        ...state,
        rigs: {
            ...state.rigs,
            [id]: { ...rig, name: new_name },
        },
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);
}

export function switch_rig(id: string): void {
    const state = rigs_state.value;
    if (!state.rigs[id]) return;

    const new_state: RigsState = {
        ...state,
        active_rig_id: id,
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);
}

export function reset_to_default_rigs(): void {
    const new_state = get_default_state();
    rigs_state.value = new_state;
    save_to_storage(new_state);
}

export function duplicate_rig(id: string): string | null {
    const state = rigs_state.value;
    const source_rig = state.rigs[id];
    if (!source_rig) return null;

    const new_rig: Rig = {
        ...source_rig,
        id: generate_id(),
        name: `${source_rig.name} (Copy)`,
        created_at: Date.now(),
    };

    const new_state: RigsState = {
        rigs: {
            ...state.rigs,
            [new_rig.id]: new_rig,
        },
        active_rig_id: new_rig.id,
    };

    rigs_state.value = new_state;
    save_to_storage(new_state);

    return new_rig.id;
}
