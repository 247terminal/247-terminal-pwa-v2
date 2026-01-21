import { useState } from 'preact/hooks';
import { X, Plus } from 'lucide-preact';
import { settings, update_settings } from '@/stores/settings_store';
import type { KeywordSettings } from '@/types/settings.types';

interface KeywordListProps {
    label: string;
    items: string[];
    on_add: (item: string) => void;
    on_remove: (index: number) => void;
    placeholder?: string;
}

function KeywordList({ label, items, on_add, on_remove, placeholder }: KeywordListProps) {
    const [input_value, set_input_value] = useState('');

    function handle_add(): void {
        const trimmed = input_value.trim().toUpperCase();
        if (!trimmed || items.includes(trimmed)) return;

        on_add(trimmed);
        set_input_value('');
    }

    function handle_keydown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            handle_add();
        }
    }

    return (
        <div class="space-y-2">
            <span class="text-xs font-medium text-base-content/50">{label}</span>
            <div class="flex gap-2">
                <input
                    type="text"
                    class="flex-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                    value={input_value}
                    onInput={(e) => set_input_value((e.target as HTMLInputElement).value)}
                    onKeyDown={handle_keydown}
                    placeholder={placeholder || 'Add keyword...'}
                />
                <button
                    type="button"
                    onClick={handle_add}
                    class="px-2 py-1.5 bg-primary/10 rounded text-primary hover:bg-primary/20 transition-colors"
                >
                    <Plus class="w-3 h-3" />
                </button>
            </div>
            {items.length > 0 && (
                <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {items.map((item, index) => (
                        <span
                            key={`${item}-${index}`}
                            class="inline-flex items-center gap-1 px-2 py-0.5 bg-base-300 rounded text-xs text-base-content group"
                        >
                            {item}
                            <button
                                type="button"
                                onClick={() => on_remove(index)}
                                class="text-base-content/40 hover:text-error transition-colors"
                            >
                                <X class="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {items.length === 0 && (
                <span class="text-xs text-base-content/40">No items added</span>
            )}
        </div>
    );
}

export function KeywordSection() {
    const keywords = settings.value.keywords;

    function update_list(key: keyof KeywordSettings, new_list: string[]): void {
        update_settings('keywords', { [key]: new_list });
    }

    function add_item(key: keyof KeywordSettings, item: string): void {
        const current = keywords[key] as string[];
        update_list(key, [...current, item]);
    }

    function remove_item(key: keyof KeywordSettings, index: number): void {
        const current = keywords[key] as string[];
        update_list(key, current.filter((_, i) => i !== index));
    }

    return (
        <div class="space-y-4">
            <KeywordList
                label="BLACKLISTED WORDS"
                items={keywords.blacklisted_words}
                on_add={(item) => add_item('blacklisted_words', item)}
                on_remove={(index) => remove_item('blacklisted_words', index)}
                placeholder="Hide news with word..."
            />

            <KeywordList
                label="BLACKLISTED COINS"
                items={keywords.blacklisted_coins}
                on_add={(item) => add_item('blacklisted_coins', item)}
                on_remove={(index) => remove_item('blacklisted_coins', index)}
                placeholder="Hide news about coin..."
            />

            <KeywordList
                label="CRITICAL KEYWORDS"
                items={keywords.critical_words}
                on_add={(item) => add_item('critical_words', item)}
                on_remove={(index) => remove_item('critical_words', index)}
                placeholder="Highlight as critical..."
            />

            <KeywordList
                label="SPECIAL KEYWORDS"
                items={keywords.special_words}
                on_add={(item) => add_item('special_words', item)}
                on_remove={(index) => remove_item('special_words', index)}
                placeholder="Trigger alert sound..."
            />

            <KeywordList
                label="CUSTOM COIN MAPPINGS"
                items={keywords.custom_mappings}
                on_add={(item) => add_item('custom_mappings', item)}
                on_remove={(index) => remove_item('custom_mappings', index)}
                placeholder="WORD:COIN format..."
            />

            <KeywordList
                label="BLACKLISTED SOURCES"
                items={keywords.blacklisted_sources}
                on_add={(item) => add_item('blacklisted_sources', item)}
                on_remove={(index) => remove_item('blacklisted_sources', index)}
                placeholder="Hide news from source..."
            />
        </div>
    );
}
