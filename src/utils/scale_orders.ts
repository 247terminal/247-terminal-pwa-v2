import type { PriceDistribution, SizeDistribution, ScaleOrderEntry } from '../types/trading.types';
import { round_price, round_quantity } from './format';

export function generate_price_levels(
    price_from: number,
    price_to: number,
    count: number,
    distribution: PriceDistribution,
    tick_size?: number
): number[] {
    if (count <= 0) return [];
    if (count === 1) return [round_price((price_from + price_to) / 2, tick_size)];

    const prices: number[] = [];
    const price_range = price_to - price_from;

    for (let i = 0; i < count; i++) {
        let t = i / (count - 1);

        switch (distribution) {
            case 'start_weighted':
                t = t * t;
                break;
            case 'end_weighted':
                t = 1 - (1 - t) * (1 - t);
                break;
            case 'linear':
            default:
                break;
        }

        const price = price_from + price_range * t;
        prices.push(round_price(price, tick_size));
    }

    return prices;
}

export function generate_size_distribution(
    total_size: number,
    count: number,
    distribution: SizeDistribution,
    qty_step?: number,
    min_qty?: number
): number[] {
    if (count <= 0) return [];
    if (count === 1) return [round_quantity(total_size, qty_step)];

    const weights: number[] = [];

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);

        switch (distribution) {
            case 'start_bigger':
                weights.push(2 * (1 - t) + 0.5);
                break;
            case 'end_bigger':
                weights.push(2 * t + 0.5);
                break;
            case 'equal':
            default:
                weights.push(1);
                break;
        }
    }

    const total_weight = weights.reduce((sum, w) => sum + w, 0);
    const sizes = weights.map((w) => round_quantity((w / total_weight) * total_size, qty_step));

    const actual_total = sizes.reduce((sum, s) => sum + s, 0);
    const remainder = total_size - actual_total;
    if (Math.abs(remainder) > 0) {
        const max_idx = sizes.indexOf(Math.max(...sizes));
        sizes[max_idx] = round_quantity(sizes[max_idx] + remainder, qty_step);
    }

    if (min_qty && min_qty > 0) {
        return sizes.filter((s) => s >= min_qty);
    }

    return sizes;
}

export function generate_scale_orders(
    price_from: number,
    price_to: number,
    total_size: number,
    orders_count: number,
    price_distribution: PriceDistribution,
    size_distribution: SizeDistribution,
    tick_size?: number,
    qty_step?: number,
    min_qty?: number
): ScaleOrderEntry[] {
    if (orders_count <= 0 || total_size <= 0) return [];

    const prices = generate_price_levels(
        price_from,
        price_to,
        orders_count,
        price_distribution,
        tick_size
    );

    const sizes = generate_size_distribution(
        total_size,
        orders_count,
        size_distribution,
        qty_step,
        min_qty
    );

    const final_count = Math.min(prices.length, sizes.length);

    const orders: ScaleOrderEntry[] = [];
    for (let i = 0; i < final_count; i++) {
        if (sizes[i] > 0 && prices[i] > 0) {
            orders.push({
                price: prices[i],
                size: sizes[i],
            });
        }
    }

    return orders;
}
