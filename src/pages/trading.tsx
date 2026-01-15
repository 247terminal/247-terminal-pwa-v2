import { useCallback, useState, useEffect } from 'preact/hooks';
import {
    ResponsiveGridLayout,
    useContainerWidth,
    type Layout,
    type ResponsiveLayouts,
} from 'react-grid-layout';
import { Header } from '../components/layout/header';
import { ChartBlock, NewsBlock, PositionsBlock, ChatBlock, TradeBlock } from '../components/blocks';
import { blocks, layouts, update_layouts, remove_block } from '../stores/layout_store';
import { layout_locked, trigger_lock_shake } from '../stores/layout_lock_store';
import { get_block_icon } from '../components/common/block_icons';
import type { BlockType } from '../types/layout.types';
import 'react-grid-layout/css/styles.css';

const GRID_ROWS = 16;
const MARGIN = 8;
const HEADER_HEIGHT = 40;

function render_block(type: BlockType, on_remove: () => void, locked: boolean) {
    const remove_handler = locked ? undefined : on_remove;
    switch (type) {
        case 'chart':
            return <ChartBlock on_remove={remove_handler} />;
        case 'news':
            return <NewsBlock on_remove={remove_handler} />;
        case 'positions':
            return <PositionsBlock on_remove={remove_handler} />;
        case 'chat':
            return <ChatBlock on_remove={remove_handler} />;
        case 'trade':
            return <TradeBlock on_remove={remove_handler} />;
        default:
            return null;
    }
}

const GRID_COLS = 16;

function GridOverlay({ row_height, width }: { row_height: number; width: number }) {
    const col_width = (width - MARGIN * 2 - MARGIN * (GRID_COLS - 1)) / GRID_COLS;

    return (
        <div class="absolute inset-0 pointer-events-none z-10" style={{ padding: MARGIN }}>
            <div class="relative w-full h-full">
                {Array.from({ length: GRID_ROWS }).map((_, row) =>
                    Array.from({ length: GRID_COLS }).map((_, col) => (
                        <div
                            key={`${row}-${col}`}
                            class="absolute rounded border border-base-content/10"
                            style={{
                                left: col * (col_width + MARGIN),
                                top: row * (row_height + MARGIN),
                                width: col_width,
                                height: row_height,
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export function TradingPage() {
    const { width, containerRef, mounted } = useContainerWidth();
    const [row_height, set_row_height] = useState(50);
    const [is_adjusting, set_is_adjusting] = useState(false);

    useEffect(() => {
        const calculate_row_height = () => {
            const available_height = window.innerHeight - HEADER_HEIGHT - MARGIN * 2;
            const total_margins = (GRID_ROWS - 1) * MARGIN;
            const height = Math.floor((available_height - total_margins) / GRID_ROWS);
            set_row_height(Math.max(30, height));
        };

        calculate_row_height();
        window.addEventListener('resize', calculate_row_height);
        return () => window.removeEventListener('resize', calculate_row_height);
    }, []);

    const handle_layout_change = useCallback((_layout: Layout, all_layouts: ResponsiveLayouts) => {
        const lg_layouts = all_layouts.lg ? [...all_layouts.lg] : [];
        update_layouts({ lg: lg_layouts });
    }, []);

    const handle_drag_start = useCallback(() => set_is_adjusting(true), []);
    const handle_drag_stop = useCallback(() => set_is_adjusting(false), []);
    const handle_resize_start = useCallback(() => set_is_adjusting(true), []);
    const handle_resize_stop = useCallback(() => set_is_adjusting(false), []);

    const handle_locked_interaction = useCallback((e: MouseEvent) => {
        if (!layout_locked.value) return;

        const target = e.target as HTMLElement;
        const is_drag_handle = target.closest('.drag-handle');
        const is_resize_handle = target.closest('.react-resizable-handle');

        if (is_drag_handle || is_resize_handle) {
            trigger_lock_shake();
        }
    }, []);

    const current_blocks = blocks.value;
    const current_layouts = layouts.value;
    const is_locked = layout_locked.value;

    return (
        <div class="h-screen flex flex-col bg-base-100">
            <Header />
            <main
                ref={containerRef as React.RefObject<HTMLDivElement>}
                class="flex-1 overflow-auto min-h-0 relative"
                onMouseDown={handle_locked_interaction}
            >
                {is_adjusting && mounted && <GridOverlay row_height={row_height} width={width} />}
                {mounted && current_blocks.length > 0 && (
                    <ResponsiveGridLayout
                        className="layout"
                        width={width}
                        layouts={current_layouts}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 16, md: 12, sm: 8, xs: 4, xxs: 2 }}
                        rowHeight={row_height}
                        margin={[MARGIN, MARGIN]}
                        containerPadding={[MARGIN, MARGIN]}
                        onLayoutChange={handle_layout_change}
                        onDragStart={handle_drag_start}
                        onDragStop={handle_drag_stop}
                        onResizeStart={handle_resize_start}
                        onResizeStop={handle_resize_stop}
                        resizeConfig={{ enabled: !is_locked }}
                        dragConfig={{
                            enabled: !is_locked,
                            handle: '.drag-handle',
                            cancel: 'button, input, .no-drag',
                        }}
                    >
                        {current_blocks.map((block) => (
                            <div
                                key={block.id}
                                class="bg-base-200 rounded border border-base-300/50 overflow-hidden flex flex-col"
                            >
                                {render_block(block.type, () => remove_block(block.id), is_locked)}
                                <div class="block-type-icon absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span class="text-primary-content">
                                        {get_block_icon(block.type, 'w-12 h-12')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                )}
                {mounted && current_blocks.length === 0 && (
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center">
                            <p class="text-base-content/50 text-sm">No blocks added</p>
                            <p class="text-base-content/30 text-xs mt-1">
                                Click the blocks button to add modules
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
