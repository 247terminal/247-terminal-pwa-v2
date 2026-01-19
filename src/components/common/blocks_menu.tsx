import { useState, useRef, useEffect } from 'preact/hooks';
import { IconButton } from './icon_button';
import { add_block } from '../../stores/layout_store';
import type { BlockType as BlockTypeEnum } from '../../types/layout.types';

interface BlockOption {
    id: BlockTypeEnum;
    name: string;
    icon: preact.JSX.Element;
}

const BLOCK_OPTIONS: BlockOption[] = [
    {
        id: 'chart',
        name: 'CHART',
        icon: (
            <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
            </svg>
        ),
    },
    {
        id: 'news',
        name: 'NEWS FEED',
        icon: (
            <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8" />
                <path d="M15 18h-5" />
                <path d="M10 6h8v4h-8V6Z" />
            </svg>
        ),
    },
    {
        id: 'chat',
        name: 'CHAT',
        icon: (
            <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        id: 'trade',
        name: 'TRADE',
        icon: (
            <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M17 7l-10 0" />
                <path d="M7 7l3-3" />
                <path d="M7 7l3 3" />
                <path d="M7 17l10 0" />
                <path d="M17 17l-3-3" />
                <path d="M17 17l-3 3" />
            </svg>
        ),
    },
    {
        id: 'account',
        name: 'ACCOUNT',
        icon: (
            <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
        ),
    },
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
                <svg class="w-4 h-4" viewBox="0 0 36 36" fill="currentColor">
                    <path d="M33.53,18.76,26.6,15.57V6.43A1,1,0,0,0,26,5.53l-7.5-3.45a1,1,0,0,0-.84,0l-7.5,3.45a1,1,0,0,0-.58.91v9.14L2.68,18.76a1,1,0,0,0-.58.91v9.78h0a1,1,0,0,0,.58.91l7.5,3.45a1,1,0,0,0,.84,0l7.08-3.26,7.08,3.26a1,1,0,0,0,.84,0l7.5-3.45a1,1,0,0,0,.58-.91h0V19.67A1,1,0,0,0,33.53,18.76Zm-2.81.91L25.61,22,20.5,19.67l5.11-2.35ZM18.1,4.08l5.11,2.35L18.1,8.78,13,6.43ZM10.6,17.31l5.11,2.35L10.6,22,5.49,19.67Zm6.5,11.49-6.5,3-6.5-3V21.23L10.18,24A1,1,0,0,0,11,24l6.08-2.8ZM11.6,15.57h0V8l6.08,2.8a1,1,0,0,0,.84,0L24.6,8v7.58h0l-6.5,3ZM32.11,28.81l-6.5,3-6.51-3V21.22L25.19,24A1,1,0,0,0,26,24l6.08-2.8Z" />
                </svg>
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
