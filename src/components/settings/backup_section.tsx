import { useState, useRef } from 'preact/hooks';
import { Download, Upload, AlertTriangle, Check } from 'lucide-preact';
import { settings, reset_settings } from '@/stores/settings_store';
import { credentials, clear_all_credentials } from '@/stores/credentials_store';
import { save_to_storage } from '@/services/settings/settings.service';
import type { ExportData } from '@/types/settings.types';

export function BackupSection() {
    const [include_credentials, set_include_credentials] = useState(false);
    const [import_status, set_import_status] = useState<'idle' | 'success' | 'error'>('idle');
    const [import_message, set_import_message] = useState('');
    const file_input_ref = useRef<HTMLInputElement>(null);

    function handle_export(): void {
        const export_data: ExportData = {
            version: 1,
            exported_at: Date.now(),
            settings: settings.value,
        };

        if (include_credentials && credentials.value) {
            export_data.credentials = credentials.value;
        }

        const blob = new Blob([JSON.stringify(export_data, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `247terminal_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function handle_import_click(): void {
        file_input_ref.current?.click();
    }

    async function handle_file_change(e: Event): Promise<void> {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text) as ExportData;

            if (!data.settings) {
                throw new Error('Invalid backup file: missing settings');
            }

            save_to_storage(data.settings);

            set_import_status('success');
            set_import_message('Settings imported successfully. Refresh to apply.');
        } catch (err) {
            set_import_status('error');
            set_import_message(err instanceof Error ? err.message : 'Failed to import backup');
        }

        input.value = '';
    }

    function handle_reset(): void {
        if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
        reset_settings();
        set_import_status('success');
        set_import_message('Settings reset to defaults');
    }

    function handle_clear_credentials(): void {
        if (!confirm('Clear all stored credentials? You will need to reconnect all exchanges.'))
            return;
        clear_all_credentials();
        set_import_status('success');
        set_import_message('All credentials cleared');
    }

    return (
        <div class="space-y-4">
            <div class="space-y-3">
                <span class="text-xs font-medium text-base-content/50">EXPORT</span>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        checked={include_credentials}
                        onChange={(e) =>
                            set_include_credentials((e.target as HTMLInputElement).checked)
                        }
                    />
                    <span class="text-xs text-base-content/70 uppercase">
                        Include API credentials
                    </span>
                </label>
                {include_credentials && (
                    <div class="flex items-start gap-2 p-2 bg-warning/10 rounded">
                        <AlertTriangle class="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <p class="text-xs text-warning">
                            Backup will contain sensitive API keys. Store securely and never share.
                        </p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={handle_export}
                    class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 rounded text-xs text-primary hover:bg-primary/20 transition-colors"
                >
                    <Download class="w-4 h-4" />
                    <span>EXPORT BACKUP</span>
                </button>
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">IMPORT</span>
                <input
                    ref={file_input_ref}
                    type="file"
                    accept=".json"
                    class="hidden"
                    onChange={handle_file_change}
                />
                <button
                    type="button"
                    onClick={handle_import_click}
                    class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-base-300 rounded text-xs text-base-content hover:bg-base-200 transition-colors"
                >
                    <Upload class="w-4 h-4" />
                    <span>IMPORT BACKUP</span>
                </button>
                {import_status !== 'idle' && (
                    <div
                        class={`flex items-center gap-2 p-2 rounded ${
                            import_status === 'success' ? 'bg-success/10' : 'bg-error/10'
                        }`}
                    >
                        {import_status === 'success' ? (
                            <Check class="w-4 h-4 text-success" />
                        ) : (
                            <AlertTriangle class="w-4 h-4 text-error" />
                        )}
                        <span
                            class={`text-xs ${import_status === 'success' ? 'text-success' : 'text-error'}`}
                        >
                            {import_message}
                        </span>
                    </div>
                )}
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">DANGER ZONE</span>
                <button
                    type="button"
                    onClick={handle_reset}
                    class="w-full px-3 py-2 bg-base-300 rounded text-xs text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                >
                    RESET ALL SETTINGS
                </button>
                <button
                    type="button"
                    onClick={handle_clear_credentials}
                    class="w-full px-3 py-2 bg-error/10 rounded text-xs text-error/60 hover:text-error hover:bg-error/20 transition-colors"
                >
                    CLEAR ALL CREDENTIALS
                </button>
            </div>
        </div>
    );
}
