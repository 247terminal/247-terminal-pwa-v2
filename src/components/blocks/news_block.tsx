import { X } from 'lucide-preact';

interface NewsBlockProps {
    on_remove?: () => void;
}

export function NewsBlock({ on_remove }: NewsBlockProps) {
    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between px-3 py-2 bg-theme-header border-b border-base-300/50 cursor-move">
                <span class="text-xs font-medium text-base-content tracking-wide">NEWS FEED</span>
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X class="w-4 h-4" />
                    </button>
                )}
            </div>
            <div class="flex-1 p-3 overflow-auto">
                <div class="space-y-3">
                    <div class="text-xs text-base-content/50 text-center py-8">
                        News feed coming soon
                    </div>
                </div>
            </div>
        </div>
    );
}
