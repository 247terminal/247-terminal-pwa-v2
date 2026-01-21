const price_formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function format_display_price(value: number): string {
    if (value >= 1000) return price_formatter.format(value);
    if (value >= 1) return value.toFixed(4);
    return value.toPrecision(4);
}

export function format_pnl(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
}

export function format_pct(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

export function format_relative_time(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
}

export function format_full_time(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

export function format_short_time(timestamp: number): string {
    const date = new Date(timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
}

export function mask_value(value: string, is_private: boolean): string {
    return is_private ? '***' : value;
}

export function format_usd(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

const usd_formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function format_usd_full(value: number): string {
    return `$${usd_formatter.format(value)}`;
}

export function format_qty(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    if (value >= 1) return value.toFixed(2);
    return value.toPrecision(4);
}
