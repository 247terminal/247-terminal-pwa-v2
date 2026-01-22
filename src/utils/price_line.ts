import { LineStyle, type CreatePriceLineOptions } from 'lightweight-charts';
import type { Position, Order } from '../types/account.types';
import type { PriceLineConfig, PriceLineType } from '../types/price_line.types';
import { PRICE_LINE_CONSTANTS } from '../config/chart.constants';
import { format_pnl } from './account_format';

export interface PriceLineColors {
    up: string;
    down: string;
}

function get_line_style(type: PriceLineType): LineStyle {
    switch (type) {
        case 'long_entry':
        case 'short_entry':
            return LineStyle.Solid;
        case 'liquidation':
            return LineStyle.Dashed;
        default:
            return LineStyle.Dotted;
    }
}

function get_entry_label(side: 'long' | 'short', unrealized_pnl: number): string {
    const direction = side === 'long' ? 'LONG' : 'SHORT';
    return `${direction} ${format_pnl(unrealized_pnl)}`;
}

function get_order_label(order: Order): string {
    switch (order.type) {
        case 'stop_loss':
            return 'SL';
        case 'take_profit':
            return 'TP';
        case 'stop':
            return `${order.side.toUpperCase()} STOP`;
        default:
            return `${order.side.toUpperCase()} LIMIT`;
    }
}

function apply_opacity(color: string, opacity: number): string {
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    if (color.startsWith('#') && color.length === 7) {
        const alpha = Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0');
        return `${color}${alpha}`;
    }
    return color;
}

export function position_to_price_line_configs(
    position: Position,
    current_price: number | null,
    colors: PriceLineColors
): PriceLineConfig[] {
    const configs: PriceLineConfig[] = [];
    const is_long = position.side === 'long';
    const color = is_long ? colors.up : colors.down;

    let unrealized_pnl = position.unrealized_pnl;
    if (current_price !== null) {
        const price_diff = is_long
            ? current_price - position.entry_price
            : position.entry_price - current_price;
        unrealized_pnl = price_diff * position.size;
    }

    configs.push({
        id: `${position.id}_entry`,
        type: is_long ? 'long_entry' : 'short_entry',
        price: position.entry_price,
        color,
        line_style: LineStyle.Solid,
        label: get_entry_label(position.side, unrealized_pnl),
    });

    if (position.liquidation_price !== null) {
        configs.push({
            id: `${position.id}_liq`,
            type: 'liquidation',
            price: position.liquidation_price,
            color: apply_opacity(colors.down, PRICE_LINE_CONSTANTS.LIQUIDATION_OPACITY),
            line_style: LineStyle.Dashed,
            label: 'LIQ',
        });
    }

    return configs;
}

export function order_to_price_line_config(order: Order, colors: PriceLineColors): PriceLineConfig {
    const is_buy = order.side === 'buy';
    const color = is_buy ? colors.up : colors.down;
    let type: PriceLineType;

    switch (order.type) {
        case 'stop_loss':
            type = is_buy ? 'buy_stop_loss' : 'sell_stop_loss';
            break;
        case 'take_profit':
            type = is_buy ? 'buy_take_profit' : 'sell_take_profit';
            break;
        default:
            type = is_buy ? 'buy_limit' : 'sell_limit';
    }

    return {
        id: `order_${order.id}`,
        type,
        price: order.price,
        color,
        line_style: get_line_style(type),
        label: get_order_label(order),
    };
}

export function create_price_line_options(config: PriceLineConfig): CreatePriceLineOptions {
    return {
        price: config.price,
        color: config.color,
        lineWidth: PRICE_LINE_CONSTANTS.LINE_WIDTH,
        lineStyle: config.line_style,
        axisLabelVisible: true,
        title: config.label,
    };
}
