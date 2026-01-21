import { useState } from 'preact/hooks';
import { settings, set_setting, update_settings } from '@/stores/settings_store';
import type {
    ShortcutBinding,
    ToggleProps,
    ShortcutEditorProps,
    ShortcutRowProps,
} from '@/types/settings.types';

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

const MODIFIER_OPTIONS = ['NONE', 'CTRL', 'SHIFT'] as const;

function ShortcutEditor({ label, binding, on_change }: ShortcutEditorProps) {
    const [is_recording, set_is_recording] = useState(false);

    function handle_keydown(e: KeyboardEvent): void {
        if (!is_recording) return;

        e.preventDefault();
        const key = e.key.toUpperCase();

        if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return;

        const new_binding: ShortcutBinding = {
            modifier_1: e.ctrlKey ? 'CTRL' : 'NONE',
            modifier_2: e.shiftKey ? 'SHIFT' : 'NONE',
            key,
        };

        on_change(new_binding);
        set_is_recording(false);
    }

    function format_binding(b: ShortcutBinding): string {
        const parts: string[] = [];
        if (b.modifier_1 !== 'NONE') parts.push(b.modifier_1);
        if (b.modifier_2 !== 'NONE') parts.push(b.modifier_2);
        parts.push(b.key || '?');
        return parts.join(' + ');
    }

    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70">{label}</span>
            <button
                type="button"
                onClick={() => set_is_recording(true)}
                onKeyDown={handle_keydown}
                onBlur={() => set_is_recording(false)}
                class={`px-3 py-1.5 rounded text-xs transition-colors ${
                    is_recording
                        ? 'bg-primary text-primary-content animate-pulse'
                        : 'bg-base-300 text-base-content hover:bg-base-200'
                }`}
            >
                {is_recording ? 'Press keys...' : format_binding(binding)}
            </button>
        </div>
    );
}

function ShortcutRow({ label, binding_key, binding, on_change }: ShortcutRowProps) {
    const default_binding: ShortcutBinding = {
        modifier_1: 'NONE',
        modifier_2: 'NONE',
        key: '',
    };

    return (
        <ShortcutEditor
            label={label}
            binding={binding || default_binding}
            on_change={(new_binding) => on_change(binding_key, new_binding)}
        />
    );
}

const SHORTCUT_LABELS: Record<string, string> = {
    buy_1: 'Buy Size 1',
    sell_1: 'Sell Size 1',
    buy_2: 'Buy Size 2',
    sell_2: 'Sell Size 2',
    buy_3: 'Buy Size 3',
    sell_3: 'Sell Size 3',
    buy_4: 'Buy Size 4',
    sell_4: 'Sell Size 4',
    close_position: 'Close Position',
    cancel_orders: 'Cancel All Orders',
};

export function ShortcutsSection() {
    const shortcuts = settings.value.shortcuts;

    function handle_binding_change(key: string, binding: ShortcutBinding): void {
        const new_bindings = { ...shortcuts.bindings, [key]: binding };
        update_settings('shortcuts', { bindings: new_bindings });
    }

    function handle_nuke_change(binding: ShortcutBinding): void {
        update_settings('shortcuts', { nuke_all: binding });
    }

    return (
        <div class="space-y-4">
            <Toggle
                label="Disable all shortcuts"
                checked={shortcuts.disabled}
                on_change={(checked) => set_setting('shortcuts', 'disabled', checked)}
            />

            {!shortcuts.disabled && (
                <>
                    <div class="pt-2 border-t border-base-300 space-y-3">
                        <span class="text-xs font-medium text-base-content/50">EMERGENCY</span>
                        <ShortcutEditor
                            label="Nuke All Positions"
                            binding={shortcuts.nuke_all}
                            on_change={handle_nuke_change}
                        />
                    </div>

                    <div class="pt-2 border-t border-base-300 space-y-3">
                        <span class="text-xs font-medium text-base-content/50">TRADING</span>
                        {Object.entries(SHORTCUT_LABELS).map(([key, label]) => (
                            <ShortcutRow
                                key={key}
                                label={label}
                                binding_key={key}
                                binding={shortcuts.bindings[key]}
                                on_change={handle_binding_change}
                            />
                        ))}
                    </div>

                    <p class="text-xs text-base-content/40">
                        Click a shortcut button and press your desired key combination
                    </p>
                </>
            )}
        </div>
    );
}
