interface RigSelectorProps {
    rig_name: string;
    on_click?: () => void;
}

export function RigSelector({ rig_name, on_click }: RigSelectorProps) {
    return (
        <button
            onClick={on_click}
            class="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded text-xs text-primary/60 hover:bg-primary/20 hover:text-primary/80 transition-colors"
        >
            <svg class="w-3 h-3" viewBox="0 0 15 15" fill="currentColor">
                <path d="m9 8.2l1 5.8h1.5c.5 0 .5 1 0 1h-8c-.5 0-.5-1 0-1H5l1-5.8q1.5 1.02 3 0M8.4 12H6.6l-.3 2h2.4zM8 9.25H7L6.75 11h1.5zm1.75-2.62c-.02.37-.19.96-.5 1.27L13 9.38v5.25c0 .5 1 .5 1 0V9.75c.75.25 1.25-1.05.5-1.3zM3.5 1C0 1-1 9.5 1.25 9.5c.75 0 1.99-3.9 1.99-3.9l2.01.75c0-.41.25-.97.52-1.26l-2.06-.78s.79-2.46.79-2.81c0-.25-.5-.5-1-.5m4 7C8.38 8 9 7.38 9 6.5C9 5.63 8.38 5 7.5 5C6.63 5 6 5.64 6 6.52C6 7.39 6.63 8 7.5 8"/>
            </svg>
            <span class="tracking-wider font-medium">{rig_name}</span>
        </button>
    );
}
