import { useEffect, useState, useRef } from 'preact/hooks';
import { Lock, LockOpen } from 'lucide-preact';
import { layout_locked, toggle_layout_lock, lock_shake } from '../../stores/layout_lock_store';

export function LayoutLockToggle() {
    const is_locked = layout_locked.value;
    const shake_trigger = lock_shake.value;
    const [is_shaking, set_is_shaking] = useState(false);
    const prev_shake_trigger = useRef(shake_trigger);

    useEffect(() => {
        if (shake_trigger > prev_shake_trigger.current && is_locked) {
            set_is_shaking(true);
            const timeout = setTimeout(() => set_is_shaking(false), 500);
            prev_shake_trigger.current = shake_trigger;
            return () => clearTimeout(timeout);
        }
        prev_shake_trigger.current = shake_trigger;
    }, [shake_trigger, is_locked]);

    return (
        <button
            type="button"
            onClick={toggle_layout_lock}
            class={`p-1 text-base-content/50 hover:text-base-content transition-colors ${is_shaking ? 'animate-shake text-error' : ''}`}
            title={is_locked ? 'Unlock layout' : 'Lock layout'}
        >
            {is_locked ? <Lock class="w-3.5 h-3.5" /> : <LockOpen class="w-3.5 h-3.5" />}
        </button>
    );
}
