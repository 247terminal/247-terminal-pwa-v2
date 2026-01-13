import { useState, useMemo, useCallback } from 'preact/hooks';
import { EXCHANGE_IDS, type ExchangeId } from '../../services/exchange/types';
import { get_exchange_icon } from '../common/exchanges';

export type Timeframe =
    | 'S1'
    | 'S5'
    | 'S15'
    | 'S30'
    | '1'
    | '5'
    | '15'
    | '30'
    | '60'
    | '120'
    | '240'
    | '480'
    | '720'
    | 'D'
    | 'W'
    | 'M';

export type ExchangeSymbols = Partial<Record<ExchangeId, string[]>>;

interface SymbolWithExchange {
    exchange: ExchangeId;
    symbol: string;
}

interface ChartToolbarProps {
    exchange: ExchangeId;
    symbol: string;
    exchange_symbols: ExchangeSymbols;
    timeframe: Timeframe;
    on_symbol_change: (exchange: ExchangeId, symbol: string) => void;
    on_timeframe_change: (tf: Timeframe) => void;
    loading?: boolean;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    S1: '1s',
    S5: '5s',
    S15: '15s',
    S30: '30s',
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '120': '2h',
    '240': '4h',
    '480': '8h',
    '720': '12h',
    D: '1D',
    W: '1W',
    M: '1M',
};

const SECONDS: Timeframe[] = ['S1', 'S5', 'S15', 'S30'];
const MINUTES: Timeframe[] = ['1', '5', '15', '30'];
const HOURS: Timeframe[] = ['60', '120', '240', '480'];
const DAYS: Timeframe[] = ['720', 'D', 'W', 'M'];

export function ChartToolbar({
    exchange,
    symbol,
    exchange_symbols,
    timeframe,
    on_symbol_change,
    on_timeframe_change,
    loading,
}: ChartToolbarProps) {
    const [symbol_open, set_symbol_open] = useState(false);
    const [timeframe_open, set_timeframe_open] = useState(false);
    const [symbol_search, set_symbol_search] = useState('');

    const all_symbols = useMemo(() => {
        const result: SymbolWithExchange[] = [];
        for (const ex of EXCHANGE_IDS) {
            const symbols = exchange_symbols[ex] || [];
            for (const s of symbols) {
                result.push({ exchange: ex, symbol: s });
            }
        }
        return result;
    }, [exchange_symbols]);

    const filtered_symbols = useMemo(() => {
        if (!symbol_search) return all_symbols;
        const search = symbol_search.toLowerCase();
        return all_symbols.filter((item) => item.symbol.toLowerCase().includes(search));
    }, [all_symbols, symbol_search]);

    const handle_symbol_select = useCallback(
        (item: SymbolWithExchange) => {
            on_symbol_change(item.exchange, item.symbol);
            set_symbol_open(false);
            set_symbol_search('');
        },
        [on_symbol_change]
    );

    const handle_timeframe_select = useCallback(
        (tf: Timeframe) => {
            on_timeframe_change(tf);
            set_timeframe_open(false);
        },
        [on_timeframe_change]
    );

    const render_timeframe_row = (timeframes: Timeframe[]) => (
        <div class="flex gap-0.5">
            {timeframes.map((tf) => (
                <button
                    type="button"
                    key={tf}
                    onClick={() => handle_timeframe_select(tf)}
                    class={`py-1 w-[36px] text-xs rounded transition-colors text-center ${
                        timeframe === tf
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                    }`}
                >
                    {TIMEFRAME_LABELS[tf]}
                </button>
            ))}
        </div>
    );

    return (
        <div class="flex items-center gap-2 px-3 py-1.5">
            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_symbol_open(!symbol_open)}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors font-medium min-w-[120px] text-left"
                >
                    {loading ? (
                        'Loading...'
                    ) : symbol ? (
                        <>
                            <span class="text-base-content/30">{get_exchange_icon(exchange)}</span>
                            <span>{symbol}</span>
                        </>
                    ) : (
                        'Select symbol'
                    )}
                </button>
                {symbol_open && (
                    <>
                        <div
                            class="fixed inset-0 z-40 no-drag"
                            onClick={() => set_symbol_open(false)}
                        />
                        <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 w-[220px] no-drag">
                            <div class="p-1">
                                <input
                                    type="text"
                                    value={symbol_search}
                                    onInput={(e) =>
                                        set_symbol_search((e.target as HTMLInputElement).value)
                                    }
                                    placeholder="Search symbols..."
                                    class="w-full px-2 py-1 text-xs bg-base-300 rounded border-none outline-none text-base-content"
                                />
                            </div>
                            <div class="max-h-[300px] overflow-y-auto p-1">
                                {filtered_symbols.slice(0, 100).map((item) => (
                                    <button
                                        type="button"
                                        key={`${item.exchange}-${item.symbol}`}
                                        onClick={() => handle_symbol_select(item)}
                                        class={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded transition-colors ${
                                            exchange === item.exchange && symbol === item.symbol
                                                ? 'bg-primary text-primary-content'
                                                : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                                        }`}
                                    >
                                        <span class="flex-shrink-0 text-base-content/30">
                                            {get_exchange_icon(item.exchange)}
                                        </span>
                                        <span class="truncate">{item.symbol}</span>
                                    </button>
                                ))}
                                {filtered_symbols.length === 0 && (
                                    <div class="px-2 py-1 text-xs text-base-content/50">
                                        No symbols found
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_timeframe_open(!timeframe_open)}
                    class="px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors"
                >
                    {TIMEFRAME_LABELS[timeframe]}
                </button>
                {timeframe_open && (
                    <>
                        <div
                            class="fixed inset-0 z-40 no-drag"
                            onClick={() => set_timeframe_open(false)}
                        />
                        <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 no-drag">
                            <div class="flex flex-col gap-0.5 p-1">
                                {render_timeframe_row(SECONDS)}
                                {render_timeframe_row(MINUTES)}
                                {render_timeframe_row(HOURS)}
                                {render_timeframe_row(DAYS)}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
