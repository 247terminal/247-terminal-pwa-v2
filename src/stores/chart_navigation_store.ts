import { signal } from '@preact/signals';
import type { ExchangeId } from '@/types/exchange.types';

interface ChartNavigationRequest {
    exchange: ExchangeId;
    symbol: string;
}

type NavigationHandler = (request: ChartNavigationRequest) => void;

const handlers = signal<Set<NavigationHandler>>(new Set());

export function navigate_to_symbol(exchange: ExchangeId, symbol: string): void {
    const request = { exchange, symbol };
    for (const handler of handlers.value) {
        handler(request);
    }
}

export function register_navigation_handler(handler: NavigationHandler): () => void {
    handlers.value = new Set([...handlers.value, handler]);
    return () => {
        const next = new Set(handlers.value);
        next.delete(handler);
        handlers.value = next;
    };
}
