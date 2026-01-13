export type BlockType = 'chart' | 'news' | 'positions' | 'chat' | 'trade';

export interface Block {
    id: string;
    type: BlockType;
}

export interface BlockLayout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
}

export interface LayoutState {
    blocks: Block[];
    layouts: {
        lg: BlockLayout[];
        md?: BlockLayout[];
        sm?: BlockLayout[];
        xs?: BlockLayout[];
        xxs?: BlockLayout[];
    };
}

export interface Rig {
    id: string;
    name: string;
    blocks: Block[];
    layouts: {
        lg: BlockLayout[];
    };
    created_at: number;
}

export interface RigsState {
    rigs: Record<string, Rig>;
    active_rig_id: string;
}

export const BLOCK_DEFAULTS: Record<BlockType, { w: number; h: number; minW: number; minH: number }> = {
    chart: { w: 6, h: 8, minW: 4, minH: 4 },
    news: { w: 3, h: 6, minW: 2, minH: 3 },
    positions: { w: 4, h: 5, minW: 3, minH: 3 },
    chat: { w: 3, h: 6, minW: 2, minH: 4 },
    trade: { w: 3, h: 6, minW: 2, minH: 4 },
};
