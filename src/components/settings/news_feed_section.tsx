import { settings, set_setting, update_settings } from '@/stores/settings_store';
import type { TradingSettings } from '@/types/settings.types';

const SIZE_COUNT_OPTIONS = [1, 2, 4] as const;
const BUTTON_STYLE_OPTIONS = [
    { value: 'swipe', label: 'Swipe' },
    { value: 'standard', label: 'Standard' },
] as const;

export function NewsFeedSection() {
    const trading = settings.value.trading;

    function update_size(index: number, value: number): void {
        const new_sizes = [...trading.sizes] as TradingSettings['sizes'];
        new_sizes[index] = value;
        update_settings('trading', { sizes: new_sizes });
    }

    function get_visible_sizes(): number[] {
        return trading.sizes.slice(0, trading.size_count);
    }

    return (
        <div class="space-y-4">
            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs text-base-content/70 uppercase">Freeze feed on hover</span>
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={trading.freeze_on_hover}
                    onChange={(e) =>
                        set_setting('trading', 'freeze_on_hover', (e.target as HTMLInputElement).checked)
                    }
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs text-base-content/70 uppercase">Full size media</span>
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={trading.full_size_media}
                    onChange={(e) =>
                        set_setting('trading', 'full_size_media', (e.target as HTMLInputElement).checked)
                    }
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs text-base-content/70 uppercase">Disable media</span>
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={trading.disable_media}
                    onChange={(e) =>
                        set_setting('trading', 'disable_media', (e.target as HTMLInputElement).checked)
                    }
                />
            </label>

            <div class="flex items-center">
                <span class="w-1/4 text-xs text-base-content/70 uppercase">Style</span>
                <div class="w-3/4 flex gap-2">
                    {BUTTON_STYLE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => set_setting('trading', 'button_style', opt.value)}
                            class={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                                trading.button_style === opt.value
                                    ? 'bg-primary/10 text-primary/80'
                                    : 'bg-base-200 text-base-content/50 hover:bg-base-300 hover:text-base-content/70'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div class="flex items-center">
                <span class="w-1/4 text-xs text-base-content/70 uppercase">Buttons</span>
                <div class="w-3/4 flex gap-2">
                    {SIZE_COUNT_OPTIONS.map((count) => (
                        <button
                            key={count}
                            type="button"
                            onClick={() => set_setting('trading', 'size_count', count)}
                            class={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                                trading.size_count === count
                                    ? 'bg-primary/10 text-primary/80'
                                    : 'bg-base-200 text-base-content/50 hover:bg-base-300 hover:text-base-content/70'
                            }`}
                        >
                            {count}
                        </button>
                    ))}
                </div>
            </div>

            <div class="flex items-center">
                <span class="w-1/4 text-xs text-base-content/70 uppercase shrink-0">Amounts</span>
                <div class="w-3/4 flex gap-2 min-w-0">
                    {get_visible_sizes().map((size, index) => (
                        <div key={index} class="relative flex-1 min-w-0">
                            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-base-content/40 z-10 pointer-events-none">
                                $
                            </span>
                            <input
                                type="number"
                                class="w-full h-7 pl-5 pr-2 text-left text-xs bg-base-200 text-base-content rounded focus:outline-none"
                                value={size}
                                min={1}
                                onInput={(e) =>
                                    update_size(index, Number((e.target as HTMLInputElement).value))
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
