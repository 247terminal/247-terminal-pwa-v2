import { useState, useRef, useEffect } from 'preact/hooks';
import {
    BarChart3,
    Newspaper,
    MessageSquare,
    ArrowLeftRight,
    User,
    LayoutGrid,
} from 'lucide-preact';
import { IconButton } from './icon_button';
import { add_block } from '../../stores/layout_store';
import type { BlockType as BlockTypeEnum } from '../../types/layout.types';

interface BlockOption {
    id: BlockTypeEnum;
    name: string;
    icon: preact.JSX.Element;
}

const ICON_CLASS = 'w-4 h-4';

const BLOCK_OPTIONS: BlockOption[] = [
    { id: 'chart', name: 'CHART', icon: <BarChart3 class={ICON_CLASS} /> },
    { id: 'news', name: 'NEWS FEED', icon: <Newspaper class={ICON_CLASS} /> },
    { id: 'chat', name: 'CHAT', icon: <MessageSquare class={ICON_CLASS} /> },
    { id: 'trade', name: 'TRADE', icon: <ArrowLeftRight class={ICON_CLASS} /> },
    { id: 'account', name: 'ACCOUNT', icon: <User class={ICON_CLASS} /> },
];

export function BlocksMenu() {
    const [is_open, set_is_open] = useState(false);
    const [clicked_id, set_clicked_id] = useState<BlockTypeEnum | null>(null);
    const container_ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                set_is_open(false);
            }
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, []);

    useEffect(() => {
        const handle_click_outside = (e: MouseEvent) => {
            if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
                set_is_open(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, []);

    const handle_block_click = (block_type: BlockTypeEnum) => {
        set_clicked_id(block_type);
        setTimeout(() => set_clicked_id(null), 300);
        add_block(block_type);
    };

    return (
        <div ref={container_ref} class="relative">
            <IconButton variant="primary" on_click={() => set_is_open(!is_open)}>
                <LayoutGrid class={ICON_CLASS} />
            </IconButton>
            {is_open && (
                <div class="fixed top-10 right-0 mt-1 w-44 bg-base-100 rounded-l shadow-lg z-50 py-1">
                    {BLOCK_OPTIONS.map((block) => (
                        <button
                            key={block.id}
                            type="button"
                            onClick={() => handle_block_click(block.id)}
                            class={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-base-200 transition-all ${
                                clicked_id === block.id ? 'animate-pulse-once bg-primary/10' : ''
                            }`}
                        >
                            <span class="text-primary">{block.icon}</span>
                            <span class="text-xs text-base-content tracking-wide">
                                {block.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
