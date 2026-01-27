export const DECIMAL_REGEX = /^\d*\.?\d*$/;

export function tick_size_to_precision(tick_size: number): number {
    if (tick_size >= 1) return 0;
    return Math.max(0, Math.ceil(-Math.log10(tick_size)));
}

export function format_price(price: number | null, tick_size: number, locale = false): string {
    if (price === null || price === 0) return '-';
    const precision = tick_size_to_precision(tick_size);
    if (locale) {
        return price.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        });
    }
    return price.toFixed(precision);
}

export function format_size(size: number, qty_step: number): string {
    if (size === 0) return '0';
    const precision = tick_size_to_precision(qty_step);
    return size.toFixed(precision);
}

export function format_market_cap(value: number | null): string {
    if (value === null || value === 0) return '-';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function split_quantity(total: number, max_per_order: number): number[] {
    if (!isFinite(total) || !isFinite(max_per_order) || max_per_order <= 0) {
        return [total];
    }

    if (total <= max_per_order) return [total];

    const precision = 1e10;
    const total_int = Math.round(total * precision);
    const max_int = Math.round(max_per_order * precision);

    const quantities: number[] = [];
    let remaining = total_int;

    while (remaining > 0) {
        const qty = Math.min(remaining, max_int);
        quantities.push(qty / precision);
        remaining -= qty;
    }

    return quantities;
}

export function round_quantity(qty: number, qty_step?: number): number {
    if (!qty_step || qty_step <= 0) return qty;
    const precision = tick_size_to_precision(qty_step);
    const multiplier = Math.pow(10, precision);
    return Math.floor(qty * multiplier) / multiplier;
}

export function validate_order_size(
    size: number,
    min_qty: number,
    qty_step: number
): { valid: boolean; adjusted_size: number; error?: string } {
    if (!isFinite(size) || size <= 0) {
        return { valid: false, adjusted_size: 0, error: 'invalid size' };
    }

    if (size < min_qty) {
        return { valid: false, adjusted_size: 0, error: `size below minimum: ${min_qty}` };
    }

    const adjusted_size = round_quantity(size, qty_step);

    if (adjusted_size < min_qty) {
        return { valid: false, adjusted_size: 0, error: `adjusted size below minimum: ${min_qty}` };
    }

    return { valid: true, adjusted_size };
}

export function round_quantity_string(qty: number, qty_step?: number): string {
    return String(round_quantity(qty, qty_step));
}

export function round_price(price: number, tick_size?: number): number {
    if (!tick_size || tick_size <= 0) return price;
    const precision = tick_size_to_precision(tick_size);
    const multiplier = Math.pow(10, precision);
    return Math.round(price * multiplier) / multiplier;
}

export function round_price_string(price: number, tick_size?: number): string {
    if (!tick_size || tick_size <= 0) return String(price);
    const precision = tick_size_to_precision(tick_size);
    return round_price(price, tick_size).toFixed(precision);
}

const ERROR_PATTERNS = {
    hyperliquid: /"statuses"\s*:\s*\[\s*\{\s*"error"\s*:\s*"([^"]+)"/,
    msg: /\{[^}]*"msg"\s*:\s*"([^"]+)"[^}]*\}/,
    bybit: /"retMsg"\s*:\s*"([^"]+)"/,
    exchange_prefix: /(?:binance|blofin|bybit|hyperliquid)[^:]*:\s*(\{.+\})$/i,
} as const;

export function extract_error_message(err: unknown): string {
    if (!err) return 'Unknown error';

    const message = (err as Error).message || String(err);

    const hl_match = message.match(ERROR_PATTERNS.hyperliquid);
    if (hl_match?.[1]) {
        return hl_match[1];
    }

    const json_match = message.match(ERROR_PATTERNS.msg);
    if (json_match?.[1]) {
        return json_match[1];
    }

    const bybit_match = message.match(ERROR_PATTERNS.bybit);
    if (bybit_match?.[1]) {
        return bybit_match[1];
    }

    const exchange_json_match = message.match(ERROR_PATTERNS.exchange_prefix);
    if (exchange_json_match?.[1]) {
        try {
            const parsed = JSON.parse(exchange_json_match[1]);
            if (parsed.msg) return parsed.msg;
            if (parsed.message) return parsed.message;
        } catch (parse_err) {
            console.error('failed to parse exchange error json:', (parse_err as Error).message);
        }
    }

    return message;
}
