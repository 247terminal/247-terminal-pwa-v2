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
import type { BlockType } from '../types/layout';
import 'react-grid-layout/css/styles.css';

const GRID_ROWS = 16;
const MARGIN = 8;
const HEADER_HEIGHT = 40;

function render_block(type: BlockType, on_remove: () => void) {
    switch (type) {
        case 'chart':
            return <ChartBlock on_remove={on_remove} />;
        case 'news':
            return <NewsBlock on_remove={on_remove} />;
        case 'positions':
            return <PositionsBlock on_remove={on_remove} />;
        case 'chat':
            return <ChatBlock on_remove={on_remove} />;
        case 'trade':
            return <TradeBlock on_remove={on_remove} />;
        default:
            return null;
    }
}

export function TradingPage() {
    const { width, containerRef, mounted } = useContainerWidth();
    const [row_height, set_row_height] = useState(50);

    useEffect(() => {
        const calculate_row_height = () => {
            const available_height = window.innerHeight - HEADER_HEIGHT - (MARGIN * 2);
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

    const current_blocks = blocks.value;
    const current_layouts = layouts.value;

    return (
        <div class="h-screen flex flex-col bg-base-100">
            <Header />
            <main ref={containerRef as React.RefObject<HTMLDivElement>} class="flex-1 overflow-auto min-h-0">
                {mounted && current_blocks.length > 0 && (
                    <ResponsiveGridLayout
                        className="layout"
                        width={width}
                        layouts={current_layouts}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={row_height}
                        margin={[MARGIN, MARGIN]}
                        containerPadding={[MARGIN, MARGIN]}
                        onLayoutChange={handle_layout_change}
                        resizeConfig={{ enabled: true }}
                    >
                        {current_blocks.map((block) => (
                            <div
                                key={block.id}
                                class="bg-base-200 rounded border border-base-300/50 overflow-hidden flex flex-col"
                            >
                                {render_block(block.type, () => remove_block(block.id))}
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                )}
                {mounted && current_blocks.length === 0 && (
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center">
                            <p class="text-base-content/50 text-sm">No blocks added</p>
                            <p class="text-base-content/30 text-xs mt-1">Click the blocks button to add modules</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
