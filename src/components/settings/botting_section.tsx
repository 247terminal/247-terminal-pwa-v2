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

const TIMEFRAME_OPTIONS = [
    { value: '1', label: '1 Hour' },
    { value: '4', label: '4 Hours' },
    { value: '8', label: '8 Hours' },
    { value: '24', label: '24 Hours' },
] as const;

export function BottingSection() {
    const botting = settings.value.botting;

    return (
        <div class="space-y-4">
            <Toggle
                label="Enable automated trading"
                checked={botting.enabled}
                on_change={(checked) => set_setting('botting', 'enabled', checked)}
            />

            {botting.enabled && (
                <>
                    <NumberInput
                        label="Cooldown period"
                        value={botting.cooldown_hours}
                        on_change={(value) => set_setting('botting', 'cooldown_hours', value)}
                        min={0}
                        max={72}
                        suffix="hrs"
                    />

                    <div class="pt-2 border-t border-base-300 space-y-3">
                        <span class="text-xs font-medium text-base-content/50">
                            MOBILE NOTIFICATIONS
                        </span>
                        <Toggle
                            label="Enable mobile alerts"
                            checked={botting.mobile_notification_enabled}
                            on_change={(checked) =>
                                set_setting('botting', 'mobile_notification_enabled', checked)
                            }
                        />
                        {botting.mobile_notification_enabled && (
                            <div class="space-y-2">
                                <span class="text-xs text-base-content/70 uppercase">
                                    NTFY Topic
                                </span>
                                <input
                                    type="text"
                                    class="w-full bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                                    value={botting.ntfy_topic}
                                    onInput={(e) =>
                                        set_setting(
                                            'botting',
                                            'ntfy_topic',
                                            (e.target as HTMLInputElement).value
                                        )
                                    }
                                    placeholder="your-ntfy-topic"
                                />
                                <p class="text-xs text-base-content/40">
                                    Subscribe to this topic in the NTFY app
                                </p>
                            </div>
                        )}
                    </div>

                    <div class="pt-2 border-t border-base-300 space-y-3">
                        <span class="text-xs font-medium text-base-content/50">AUTO-PAUSE</span>
                        <Toggle
                            label="Auto-pause on threshold"
                            checked={botting.auto_pause_enabled}
                            on_change={(checked) =>
                                set_setting('botting', 'auto_pause_enabled', checked)
                            }
                        />
                        {botting.auto_pause_enabled && (
                            <>
                                <div class="flex items-center justify-between">
                                    <span class="text-xs text-base-content/70 uppercase">
                                        Timeframe
                                    </span>
                                    <select
                                        class="bg-base-300 px-2 py-1 rounded text-xs text-base-content outline-none"
                                        value={botting.auto_pause_timeframe}
                                        onChange={(e) =>
                                            set_setting(
                                                'botting',
                                                'auto_pause_timeframe',
                                                (e.target as HTMLSelectElement).value
                                            )
                                        }
                                    >
                                        {TIMEFRAME_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <NumberInput
                                    label="Loss threshold"
                                    value={botting.auto_pause_threshold}
                                    on_change={(value) =>
                                        set_setting('botting', 'auto_pause_threshold', value)
                                    }
                                    min={1}
                                    max={100}
                                    suffix="%"
                                />
                                <p class="text-xs text-base-content/40">
                                    Bot will pause if losses exceed threshold within timeframe
                                </p>
                            </>
                        )}
                    </div>
                </>
            )}

            {!botting.enabled && (
                <p class="text-xs text-base-content/40">
                    Enable automated trading to configure bot settings
                </p>
            )}
        </div>
    );
}
