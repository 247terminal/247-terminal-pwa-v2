import { settings, set_setting } from '@/stores/settings_store';

interface ToggleProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
}

function Toggle({ label, checked, on_change }: ToggleProps) {
    return (
        <label class="flex items-center justify-between cursor-pointer">
            <span class="text-xs text-base-content/70">{label}</span>
            <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                checked={checked}
                onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
            />
        </label>
    );
}

interface NumberInputProps {
    label: string;
    value: number;
    on_change: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

function NumberInput({ label, value, on_change, min, max, step = 1, suffix }: NumberInputProps) {
    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70">{label}</span>
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
                <span class="text-xs font-medium text-base-content/50">NEWS PROVIDERS</span>
                <Toggle
                    label="Phoenix News"
                    checked={news_providers.phoenix_enabled}
                    on_change={(checked) => set_setting('news_providers', 'phoenix_enabled', checked)}
                />
                <Toggle
                    label="Tree of Alpha"
                    checked={news_providers.tree_enabled}
                    on_change={(checked) => set_setting('news_providers', 'tree_enabled', checked)}
                />
                <Toggle
                    label="Synoptic"
                    checked={news_providers.synoptic_enabled}
                    on_change={(checked) => set_setting('news_providers', 'synoptic_enabled', checked)}
                />
                <Toggle
                    label="Groq AI (sentiment)"
                    checked={news_providers.groq_enabled}
                    on_change={(checked) => set_setting('news_providers', 'groq_enabled', checked)}
                />
                <p class="text-xs text-base-content/40">
                    API keys are configured in the exchange panel
                </p>
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">DISPLAY OPTIONS</span>
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
                <NumberInput
                    label="Font size"
                    value={news_display.font_size}
                    on_change={(value) => set_setting('news_display', 'font_size', value)}
                    min={8}
                    max={24}
                    suffix="px"
                />
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">PRICE MOVEMENT</span>
                <Toggle
                    label="Highlight price movements"
                    checked={news_display.price_movement_highlight}
                    on_change={(checked) =>
                        set_setting('news_display', 'price_movement_highlight', checked)
                    }
                />
                {news_display.price_movement_highlight && (
                    <>
                        <NumberInput
                            label="Threshold"
                            value={news_display.price_movement_threshold}
                            on_change={(value) =>
                                set_setting('news_display', 'price_movement_threshold', value)
                            }
                            min={0.1}
                            max={50}
                            step={0.1}
                            suffix="%"
                        />
                        <Toggle
                            label="Notify on movement"
                            checked={news_display.price_movement_notification}
                            on_change={(checked) =>
                                set_setting('news_display', 'price_movement_notification', checked)
                            }
                        />
                    </>
                )}
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">TRANSLATION</span>
                <Toggle
                    label="Enable translation"
                    checked={news_display.translation_enabled}
                    on_change={(checked) =>
                        set_setting('news_display', 'translation_enabled', checked)
                    }
                />
                {news_display.translation_enabled && (
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-base-content/70">Target language</span>
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

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">LIMITS</span>
                <NumberInput
                    label="Delay threshold"
                    value={news_display.delay_threshold}
                    on_change={(value) => set_setting('news_display', 'delay_threshold', value)}
                    min={0}
                    max={60000}
                    step={100}
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
