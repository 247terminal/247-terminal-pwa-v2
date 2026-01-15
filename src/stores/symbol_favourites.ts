import { signal } from '@preact/signals';
import type { ExchangeId } from '../types/exchange.types';

const STORAGE_KEY = '247terminal_favourites';

export interface FavouriteSymbol {
    exchange: ExchangeId;
    symbol: string;
}

function load_from_storage(): FavouriteSymbol[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('failed to load favourites from storage:', e);
    }
    return [];
}

function save_to_storage(favourites: FavouriteSymbol[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
    } catch (e) {
        console.error('failed to save favourites to storage:', e);
    }
}

export const favourites = signal<FavouriteSymbol[]>(load_from_storage());

function is_favourite(exchange: ExchangeId, symbol: string): boolean {
    return favourites.value.some((f) => f.exchange === exchange && f.symbol === symbol);
}

export function toggle_favourite(exchange: ExchangeId, symbol: string): void {
    const exists = is_favourite(exchange, symbol);
    const updated = exists
        ? favourites.value.filter((f) => !(f.exchange === exchange && f.symbol === symbol))
        : [...favourites.value, { exchange, symbol }];

    favourites.value = updated;
    save_to_storage(updated);
}
