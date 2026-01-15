import type { BlockType } from '../../types/layout.types';

export function get_block_icon(type: BlockType, class_name: string = 'w-4 h-4') {
    switch (type) {
        case 'chart':
            return (
                <svg class={class_name} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="M18 17V9"/>
                    <path d="M13 17V5"/>
                    <path d="M8 17v-3"/>
                </svg>
            );
        case 'news':
            return (
                <svg class={class_name} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                    <path d="M18 14h-8"/>
                    <path d="M15 18h-5"/>
                    <path d="M10 6h8v4h-8V6Z"/>
                </svg>
            );
        case 'positions':
            return (
                <svg class={class_name} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
            );
        case 'chat':
            return (
                <svg class={class_name} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            );
        case 'trade':
            return (
                <svg class={class_name} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 7l-10 0"/>
                    <path d="M7 7l3-3"/>
                    <path d="M7 7l3 3"/>
                    <path d="M7 17l10 0"/>
                    <path d="M17 17l-3-3"/>
                    <path d="M17 17l-3 3"/>
                </svg>
            );
        default:
            return null;
    }
}
