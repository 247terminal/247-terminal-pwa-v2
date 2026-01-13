import { signal, computed } from '@preact/signals';
import type { Block, BlockType, BlockLayout, LayoutState } from '../types/layout';
import { BLOCK_DEFAULTS } from '../types/layout';

const STORAGE_KEY = '247terminal_layout';

function generate_id(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function load_from_storage(): LayoutState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load layout from storage:', e);
    }
    return null;
}

function save_to_storage(state: LayoutState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save layout to storage:', e);
    }
}

function get_default_state(): LayoutState {
    const chart_id = 'chart_default';
    return {
        blocks: [{ id: chart_id, type: 'chart' }],
        layouts: {
            lg: [{ i: chart_id, x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4 }],
        },
    };
}

function find_next_position(layouts: BlockLayout[]): { x: number; y: number } {
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

    return { x: 0, y: max_bottom };
}

const initial_state = load_from_storage() || get_default_state();

export const layout_state = signal<LayoutState>(initial_state);

export const blocks = computed(() => layout_state.value.blocks);
export const layouts = computed(() => layout_state.value.layouts);

export function add_block(type: BlockType): string {
    const id = generate_id();
    const defaults = BLOCK_DEFAULTS[type];
    const current_layouts = layout_state.value.layouts.lg || [];
    const position = find_next_position(current_layouts);

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

    const new_state: LayoutState = {
        blocks: [...layout_state.value.blocks, new_block],
        layouts: {
            ...layout_state.value.layouts,
            lg: [...current_layouts, new_layout],
        },
    };

    layout_state.value = new_state;
    save_to_storage(new_state);

    return id;
}

export function remove_block(id: string): void {
    const new_state: LayoutState = {
        blocks: layout_state.value.blocks.filter(b => b.id !== id),
        layouts: {
            ...layout_state.value.layouts,
            lg: (layout_state.value.layouts.lg || []).filter(l => l.i !== id),
        },
    };

    layout_state.value = new_state;
    save_to_storage(new_state);
}

export function update_layouts(new_layouts: { lg: BlockLayout[] }): void {
    const new_state: LayoutState = {
        ...layout_state.value,
        layouts: new_layouts,
    };

    layout_state.value = new_state;
    save_to_storage(new_state);
}

export function reset_layout(): void {
    const default_state = get_default_state();
    layout_state.value = default_state;
    save_to_storage(default_state);
}
