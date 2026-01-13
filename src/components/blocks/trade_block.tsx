interface TradeBlockProps {
    on_remove?: () => void;
}

export function TradeBlock({ on_remove }: TradeBlockProps) {
    return (
        <div class="h-full flex flex-col group">
            <div class="flex items-center justify-between px-3 py-2 bg-theme-header border-b border-base-300/50">
                <span class="text-xs font-medium text-base-content tracking-wide">TRADE</span>
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div class="flex-1 p-3 overflow-auto">
                <div class="text-xs text-base-content/50 text-center py-8">
                    Trade panel coming soon
                </div>
            </div>
        </div>
    );
}
