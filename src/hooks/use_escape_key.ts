import { useEffect } from "preact/hooks";

export function use_escape_key(handler: () => void): void {
    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handler();
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, [handler]);
}