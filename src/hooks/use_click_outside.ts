import { useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';

export function use_click_outside(
    ref: RefObject<HTMLElement>,
    handler: () => void
): void {
    useEffect(() => {
        const handle_click = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handler();
            }
        };
        document.addEventListener('mousedown', handle_click);
        return () => document.removeEventListener('mousedown', handle_click);
    }, [ref, handler]);
}