import { useCallback } from 'preact/hooks';
import type {
    SizeUnit,
    PriceDistribution,
    SizeDistribution,
    PriceInputProps,
    QuantityInputProps,
    TotalInputProps,
    SliderInputProps,
    ToggleInputProps,
    SegmentOption,
    SegmentSelectorProps,
} from '../../../types/trade.types';

export function PriceInput({
    label,
    value,
    on_change,
    show_last,
    on_last_click,
    placeholder = '0.00',
}: PriceInputProps) {
    const handle_input = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            const val = input.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                on_change(val);
            }
        },
        [on_change]
    );

    return (
        <div class="flex flex-col gap-1">
            <label class="text-[10px] text-base-content/50 uppercase tracking-wide">{label}</label>
            <div class="flex gap-1">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onInput={handle_input}
                    class="flex-1 bg-base-200 px-2 py-1.5 rounded text-xs text-base-content outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder={placeholder}
                />
                {show_last && on_last_click && (
                    <button
                        type="button"
                        onClick={on_last_click}
                        class="px-2 py-1.5 text-[10px] bg-base-200 rounded text-base-content/60 hover:text-base-content hover:bg-base-300 transition-colors"
                    >
                        Last
                    </button>
                )}
            </div>
        </div>
    );
}

export function QuantityInput({
    label = 'Amount',
    value,
    on_change,
    size_unit,
    on_unit_change,
    coin_symbol = 'BTC',
}: QuantityInputProps) {
    const handle_input = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            const val = input.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                on_change(val);
            }
        },
        [on_change]
    );

    const toggle_unit = useCallback(() => {
        on_unit_change(size_unit === 'usd' ? 'coin' : 'usd');
    }, [size_unit, on_unit_change]);

    return (
        <div class="flex flex-col gap-1">
            <label class="text-[10px] text-base-content/50 uppercase tracking-wide">{label}</label>
            <div class="flex gap-1">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onInput={handle_input}
                    class="flex-1 bg-base-200 px-2 py-1.5 rounded text-xs text-base-content outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="0.00"
                />
                <button
                    type="button"
                    onClick={toggle_unit}
                    class="px-2 py-1.5 text-[10px] bg-base-200 rounded text-base-content/60 hover:text-base-content hover:bg-base-300 transition-colors min-w-10"
                >
                    {size_unit === 'usd' ? 'USD' : coin_symbol}
                </button>
            </div>
        </div>
    );
}

export function TotalInput({ label = 'Total', value, on_change, suffix = 'USD' }: TotalInputProps) {
    const handle_input = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            const val = input.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                on_change(val);
            }
        },
        [on_change]
    );

    return (
        <div class="flex flex-col gap-1">
            <label class="text-[10px] text-base-content/50 uppercase tracking-wide">{label}</label>
            <div class="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onInput={handle_input}
                    class="w-full bg-base-200 px-2 py-1.5 pr-10 rounded text-xs text-base-content outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="0.00"
                />
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-base-content/40">
                    {suffix}
                </span>
            </div>
        </div>
    );
}

export function SliderInput({
    label,
    value,
    min,
    max,
    on_change,
    format_value,
    show_max,
}: SliderInputProps) {
    const handle_input = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            on_change(parseInt(input.value, 10));
        },
        [on_change]
    );

    const display_value = format_value ? format_value(value) : value.toString();

    return (
        <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
                <label class="text-[10px] text-base-content/50 uppercase tracking-wide">
                    {label}
                </label>
                <span class="text-xs text-base-content tabular-nums">
                    {display_value}
                    {show_max && <span class="text-base-content/40 text-[10px] ml-1">/{max}</span>}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onInput={handle_input}
                class="range range-xs range-primary w-full"
            />
        </div>
    );
}

export function ToggleInput({ label, checked, on_change }: ToggleInputProps) {
    const handle_change = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            on_change(input.checked);
        },
        [on_change]
    );

    return (
        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={handle_change}
                class="toggle toggle-xs toggle-primary"
            />
            <span class="text-xs text-base-content/70">{label}</span>
        </label>
    );
}

export function SegmentSelector<T extends string>({
    label,
    value,
    options,
    on_change,
}: SegmentSelectorProps<T>) {
    return (
        <div class="flex flex-col gap-1">
            <label class="text-[10px] text-base-content/50 uppercase tracking-wide">{label}</label>
            <div class="flex gap-0.5">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => on_change(opt.value)}
                        class={`flex-1 px-1.5 py-1 text-[10px] rounded transition-colors ${
                            value === opt.value
                                ? 'bg-primary text-primary-content'
                                : 'bg-base-200 text-base-content/60 hover:text-base-content hover:bg-base-300'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export const PRICE_DISTRIBUTION_OPTIONS: SegmentOption<PriceDistribution>[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'start_weighted', label: 'Dense Start' },
    { value: 'end_weighted', label: 'Dense End' },
];

export const SIZE_DISTRIBUTION_OPTIONS: SegmentOption<SizeDistribution>[] = [
    { value: 'equal', label: 'Equal' },
    { value: 'start_bigger', label: 'Bigger Start' },
    { value: 'end_bigger', label: 'Bigger End' },
];
