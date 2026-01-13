import { useEffect, useState } from 'preact/hooks';
import { layout_locked, toggle_layout_lock, lock_shake } from '../../stores/layout_lock_store';

export function LayoutLockToggle() {
    const is_locked = layout_locked.value;
    const shake_trigger = lock_shake.value;
    const [is_shaking, set_is_shaking] = useState(false);

    useEffect(() => {
        if (shake_trigger > 0 && is_locked) {
            set_is_shaking(true);
            const timeout = setTimeout(() => set_is_shaking(false), 500);
            return () => clearTimeout(timeout);
        }
    }, [shake_trigger, is_locked]);

    return (
        <button
            type="button"
            onClick={toggle_layout_lock}
            class={`p-1 text-base-content/50 hover:text-base-content transition-colors ${is_shaking ? 'animate-shake text-error' : ''}`}
            title={is_locked ? 'Unlock layout' : 'Lock layout'}
        >
            {is_locked ? (
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            ) : (
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
            )}
        </button>
    );
}
