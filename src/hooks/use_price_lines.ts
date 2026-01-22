import { useRef, useEffect } from 'preact/hooks';
import type { ISeriesApi, IPriceLine } from 'lightweight-charts';
import type { Position, Order } from '../types/account.types';
import type { PriceLineConfig } from '../types/price_line.types';
import {
    position_to_price_line_configs,
    order_to_price_line_config,
    create_price_line_options,
    type PriceLineColors,
} from '../utils/price_line';

interface UsePriceLinesParams {
    series: ISeriesApi<'Candlestick'> | null;
    positions: Position[];
    orders: Order[];
    current_price: number | null;
    data_key?: string;
    colors: PriceLineColors;
}

interface PriceLineEntry {
    line: IPriceLine;
    config: PriceLineConfig;
}

export function use_price_lines({
    series,
    positions,
    orders,
    current_price,
    data_key,
    colors,
}: UsePriceLinesParams): void {
    const lines_ref = useRef<Map<string, PriceLineEntry>>(new Map());
    const prev_data_key_ref = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!series) return;

        if (prev_data_key_ref.current !== data_key) {
            for (const entry of lines_ref.current.values()) {
                series.removePriceLine(entry.line);
            }
            lines_ref.current.clear();
            prev_data_key_ref.current = data_key;
        }

        const new_configs: PriceLineConfig[] = [];

        for (const position of positions) {
            new_configs.push(...position_to_price_line_configs(position, current_price, colors));
        }

        for (const order of orders) {
            new_configs.push(order_to_price_line_config(order, colors));
        }

        const new_config_ids = new Set(new_configs.map((c) => c.id));
        const current_lines = lines_ref.current;

        for (const [id, entry] of current_lines) {
            if (!new_config_ids.has(id)) {
                series.removePriceLine(entry.line);
                current_lines.delete(id);
            }
        }

        for (const config of new_configs) {
            const existing = current_lines.get(config.id);
            if (existing) {
                const needs_update =
                    existing.config.price !== config.price ||
                    existing.config.label !== config.label ||
                    existing.config.color !== config.color;

                if (needs_update) {
                    existing.line.applyOptions(create_price_line_options(config));
                    existing.config = config;
                }
            } else {
                const line = series.createPriceLine(create_price_line_options(config));
                current_lines.set(config.id, { line, config });
            }
        }
    }, [series, positions, orders, current_price, data_key, colors]);

    useEffect(() => {
        return () => {
            lines_ref.current.clear();
        };
    }, []);
}
