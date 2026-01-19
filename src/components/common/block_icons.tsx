import { BarChart3, Newspaper, MessageSquare, ArrowLeftRight, User } from 'lucide-preact';
import type { BlockType } from '../../types/layout.types';

export function get_block_icon(type: BlockType, class_name: string = 'w-4 h-4') {
    switch (type) {
        case 'chart':
            return <BarChart3 class={class_name} />;
        case 'news':
            return <Newspaper class={class_name} />;
        case 'chat':
            return <MessageSquare class={class_name} />;
        case 'trade':
            return <ArrowLeftRight class={class_name} />;
        case 'account':
            return <User class={class_name} />;
        default:
            return null;
    }
}
