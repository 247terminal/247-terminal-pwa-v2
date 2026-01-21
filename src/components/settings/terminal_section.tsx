import { settings, set_setting } from '@/stores/settings_store';
import { NOTIFICATION_FILTER_OPTIONS } from '@/services/settings/settings.constants';
import type { ToggleProps } from '@/types/settings.types';

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

export function TerminalSection() {
    const terminal = settings.value.terminal;

    return (
        <div class="space-y-3">
            <Toggle
                label="Auto login on launch"
                checked={terminal.auto_login}
                on_change={(checked) => set_setting('terminal', 'auto_login', checked)}
            />

            <Toggle
                label="Push notifications"
                checked={terminal.push_notifications}
                on_change={(checked) => set_setting('terminal', 'push_notifications', checked)}
            />

            {terminal.push_notifications && (
                <div class="flex items-center justify-between">
                    <span class="text-xs text-base-content/70">Notification filter</span>
                    <select
                        class="bg-base-300 px-2 py-1 rounded text-xs text-base-content outline-none"
                        value={terminal.notification_filter}
                        onChange={(e) =>
                            set_setting(
                                'terminal',
                                'notification_filter',
                                (e.target as HTMLSelectElement)
                                    .value as typeof terminal.notification_filter
                            )
                        }
                    >
                        {NOTIFICATION_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">MEDIA</span>
                <Toggle
                    label="Full size media"
                    checked={terminal.full_size_media}
                    on_change={(checked) => set_setting('terminal', 'full_size_media', checked)}
                />
                <Toggle
                    label="Disable media completely"
                    checked={terminal.disable_media}
                    on_change={(checked) => set_setting('terminal', 'disable_media', checked)}
                />
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">BEHAVIOR</span>
                <Toggle
                    label="Freeze feed on hover"
                    checked={terminal.freeze_on_hover}
                    on_change={(checked) => set_setting('terminal', 'freeze_on_hover', checked)}
                />
                <Toggle
                    label="Share trades in chat"
                    checked={terminal.share_trades}
                    on_change={(checked) => set_setting('terminal', 'share_trades', checked)}
                />
                <Toggle
                    label="Show dollar profit on PnL"
                    checked={terminal.show_profit}
                    on_change={(checked) => set_setting('terminal', 'show_profit', checked)}
                />
            </div>
        </div>
    );
}
