import { useState } from 'preact/hooks';
import { settings, set_setting } from '@/stores/settings_store';
import type { ToggleProps, NumberInputProps } from '@/types/settings.types';

function Toggle({ label, checked, on_change }: ToggleProps) {
    return (
        <label class="flex items-center justify-between cursor-pointer">
            <span class="text-xs text-base-content/70 uppercase">{label}</span>
            <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                checked={checked}
                onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
            />
        </label>
    );
}

interface ProviderToggleProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
    on_connect: (api_key: string) => void;
    placeholder?: string;
}

function ProviderToggle({ label, checked, on_change, on_connect, placeholder }: ProviderToggleProps) {
    const [api_key, set_api_key] = useState('');

    return (
        <div class="flex items-center">
            <span class="w-1/4 text-xs text-base-content/70 uppercase">{label}</span>
            <div class="w-3/4 flex items-center justify-end gap-2">
                {checked && (
                    <div class="relative flex-1">
                        <input
                            type="text"
                            class="w-full h-7 px-2 pr-16 text-xs bg-base-200 text-base-content rounded outline-none"
                            value={api_key}
                            onInput={(e) => set_api_key((e.target as HTMLInputElement).value)}
                            placeholder={placeholder || 'API Key'}
                        />
                        <button
                            type="button"
                            class="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs rounded transition-colors"
                            onClick={() => on_connect(api_key)}
                        >
                            Connect
                        </button>
                    </div>
                )}
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={checked}
                    onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
                />
            </div>
        </div>
    );
}

function NumberInput({ label, value, on_change, min, max, step = 1, suffix }: NumberInputProps) {
    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70 uppercase">{label}</span>
            <div class="flex items-center gap-1">
                <input
                    type="number"
                    class="w-20 bg-base-300 px-2 py-1 rounded text-xs text-base-content text-right outline-none"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onInput={(e) => on_change(Number((e.target as HTMLInputElement).value))}
                />
                {suffix && <span class="text-xs text-base-content/50">{suffix}</span>}
            </div>
        </div>
    );
}

interface SliderInputProps {
    label: string;
    value: number;
    on_change: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
}

function SliderInput({ label, value, on_change, min, max, step = 1, suffix }: SliderInputProps) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div class="flex items-center">
            <span class="w-1/4 text-xs text-base-content/70 uppercase">{label}</span>
            <div class="w-3/4 flex items-center justify-end gap-2">
                <div class="relative flex-1 h-2">
                    <div class="absolute inset-0 bg-base-300 rounded-full" />
                    <div
                        class="absolute inset-y-0 left-0 bg-primary/20 rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                    <input
                        type="range"
                        class="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                        value={value}
                        min={min}
                        max={max}
                        step={step}
                        onInput={(e) => on_change(Number((e.target as HTMLInputElement).value))}
                    />
                </div>
                <span class="text-xs w-10 text-right tabular-nums text-primary/80">
                    {value}
                    {suffix}
                </span>
            </div>
        </div>
    );
}

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'ru', label: 'Russian' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
] as const;

export function NewsSection() {
    const news_providers = settings.value.news_providers;
    const news_display = settings.value.news_display;

    return (
        <div class="space-y-4">
            <div class="space-y-3">
                <ProviderToggle
                    label="Phoenix News"
                    checked={news_providers.phoenix_enabled}
                    on_change={(checked) =>
                        set_setting('news_providers', 'phoenix_enabled', checked)
                    }
                    on_connect={(key) => console.log('Phoenix connect:', key)}
                    placeholder="Phoenix API Key"
                />
                <ProviderToggle
                    label="Tree of Alpha"
                    checked={news_providers.tree_enabled}
                    on_change={(checked) => set_setting('news_providers', 'tree_enabled', checked)}
                    on_connect={(key) => console.log('Tree connect:', key)}
                    placeholder="Tree of Alpha API Key"
                />
                <ProviderToggle
                    label="Synoptic"
                    checked={news_providers.synoptic_enabled}
                    on_change={(checked) =>
                        set_setting('news_providers', 'synoptic_enabled', checked)
                    }
                    on_connect={(key) => console.log('Synoptic connect:', key)}
                    placeholder="Synoptic API Key"
                />
                <ProviderToggle
                    label="Groq AI (sentiment)"
                    checked={news_providers.groq_enabled}
                    on_change={(checked) => set_setting('news_providers', 'groq_enabled', checked)}
                    on_connect={(key) => console.log('Groq connect:', key)}
                    placeholder="Groq API Key"
                />
            </div>

            <div class="pt-3 border-t border-base-300 space-y-3">
                <Toggle
                    label="Deduplicate news"
                    checked={news_display.deduplicator}
                    on_change={(checked) => set_setting('news_display', 'deduplicator', checked)}
                />
                <Toggle
                    label="Shorten long text"
                    checked={news_display.text_shortener}
                    on_change={(checked) => set_setting('news_display', 'text_shortener', checked)}
                />
                <Toggle
                    label="Directional highlighting"
                    checked={news_display.directional_highlight}
                    on_change={(checked) =>
                        set_setting('news_display', 'directional_highlight', checked)
                    }
                />
                <Toggle
                    label="Hide news without tickers"
                    checked={news_display.hide_tickerless}
                    on_change={(checked) => set_setting('news_display', 'hide_tickerless', checked)}
                />
            </div>

            <div class="pt-3 border-t border-base-300 space-y-3">
                <Toggle
                    label="Highlight price movements"
                    checked={news_display.price_movement_highlight}
                    on_change={(checked) =>
                        set_setting('news_display', 'price_movement_highlight', checked)
                    }
                />
                <SliderInput
                    label="Threshold"
                    value={news_display.price_movement_threshold}
                    on_change={(value) =>
                        set_setting('news_display', 'price_movement_threshold', value)
                    }
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                />
                <Toggle
                    label="Notify on movement"
                    checked={news_display.price_movement_notification}
                    on_change={(checked) =>
                        set_setting('news_display', 'price_movement_notification', checked)
                    }
                />
            </div>

            <div class="pt-3 border-t border-base-300 space-y-3">
                <Toggle
                    label="Enable translation"
                    checked={news_display.translation_enabled}
                    on_change={(checked) =>
                        set_setting('news_display', 'translation_enabled', checked)
                    }
                />
                {news_display.translation_enabled && (
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-base-content/70 uppercase">Target language</span>
                        <select
                            class="bg-base-300 px-2 py-1 rounded text-xs text-base-content outline-none"
                            value={news_display.translation_language}
                            onChange={(e) =>
                                set_setting(
                                    'news_display',
                                    'translation_language',
                                    (e.target as HTMLSelectElement).value
                                )
                            }
                        >
                            {LANGUAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div class="pt-3 border-t border-base-300 space-y-3">
                <SliderInput
                    label="Delay threshold"
                    value={news_display.delay_threshold}
                    on_change={(value) => set_setting('news_display', 'delay_threshold', value)}
                    min={0}
                    max={6000}
                    step={10}
                    suffix="ms"
                />
                <NumberInput
                    label="History limit"
                    value={news_display.history_limit}
                    on_change={(value) => set_setting('news_display', 'history_limit', value)}
                    min={10}
                    max={500}
                />
                <NumberInput
                    label="Auto-clear after"
                    value={news_display.auto_clear_seconds}
                    on_change={(value) => set_setting('news_display', 'auto_clear_seconds', value)}
                    min={0}
                    max={3600}
                    suffix="s"
                />
            </div>
        </div>
    );
}
