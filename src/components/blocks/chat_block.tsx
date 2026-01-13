interface ChatBlockProps {
    on_remove?: () => void;
}

export function ChatBlock({ on_remove }: ChatBlockProps) {
    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between px-3 py-2 bg-theme-header border-b border-base-300/50 cursor-move">
                <span class="text-xs font-medium text-base-content tracking-wide">CHAT</span>
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div class="flex-1 flex flex-col">
                <div class="flex-1 p-3 overflow-auto">
                    <div class="text-xs text-base-content/50 text-center py-8">
                        Chat coming soon
                    </div>
                </div>
                <div class="p-2 border-t border-base-300/50">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        class="w-full px-3 py-2 bg-base-300/50 rounded text-xs text-base-content placeholder:text-base-content/40 outline-none"
                        disabled
                    />
                </div>
            </div>
        </div>
    );
}
