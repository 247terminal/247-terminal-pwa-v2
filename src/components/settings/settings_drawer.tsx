import { useState, useRef, useCallback } from 'preact/hooks';
import { X, ChevronDown, Loader2 } from 'lucide-preact';
import { use_click_outside, use_escape_key } from '@/hooks';
import { settings_status } from '@/stores/settings_store';
import { TradingSection } from './trading_section';
import { TerminalSection } from './terminal_section';
import { ChartSection } from './chart_section';
import { NewsSection } from './news_section';
import { KeywordSection } from './keyword_section';
import { ShortcutsSection } from './shortcuts_section';
import { BottingSection } from './botting_section';
import { BackupSection } from './backup_section';

type SectionId =
    | 'trading'
    | 'terminal'
    | 'chart'
    | 'news'
    | 'keywords'
    | 'shortcuts'
    | 'botting'
    | 'backup';

interface SettingsDrawerProps {
    is_open: boolean;
    on_close: () => void;
}

interface AccordionSectionProps {
    id: SectionId;
    title: string;
    expanded_section: SectionId | null;
    on_toggle: (id: SectionId) => void;
    children: preact.ComponentChildren;
}

function AccordionSection({
    id,
    title,
    expanded_section,
    on_toggle,
    children,
}: AccordionSectionProps) {
    const is_expanded = expanded_section === id;

    return (
        <div class="border-b border-base-300 last:border-b-0">
            <button
                type="button"
                onClick={() => on_toggle(id)}
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-base-200/50 transition-colors"
            >
                <span class="text-xs font-medium tracking-wide text-base-content">{title}</span>
                <ChevronDown
                    class={`w-4 h-4 text-base-content/40 transition-transform ${is_expanded ? 'rotate-180' : ''}`}
                />
            </button>
            {is_expanded && <div class="px-4 pb-4">{children}</div>}
        </div>
    );
}

function SyncIndicator() {
    const status = settings_status.value;

    if (status === 'saving') {
        return (
            <div class="flex items-center gap-1.5 text-primary">
                <Loader2 class="w-3 h-3 animate-spin" />
                <span class="text-xs">Syncing...</span>
            </div>
        );
    }

    if (status === 'error') {
        return <span class="text-xs text-error">Sync failed</span>;
    }

    return null;
}

export function SettingsDrawer({ is_open, on_close }: SettingsDrawerProps) {
    const drawer_ref = useRef<HTMLDivElement>(null);
    const [expanded_section, set_expanded_section] = useState<SectionId | null>('trading');

    const handle_close = useCallback(() => {
        on_close();
    }, [on_close]);

    use_click_outside(drawer_ref, handle_close);
    use_escape_key(handle_close);

    if (!is_open) return null;

    function toggle_section(id: SectionId): void {
        set_expanded_section((prev) => (prev === id ? null : id));
    }

    return (
        <div class="fixed inset-0 z-50">
            <div class="absolute inset-0 bg-black/40" />
            <div
                ref={drawer_ref}
                class="absolute top-0 right-0 h-full w-80 bg-base-100 shadow-xl flex flex-col animate-slide-in-right"
            >
                <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
                    <span class="text-sm font-semibold tracking-wide text-base-content">
                        SETTINGS
                    </span>
                    <div class="flex items-center gap-3">
                        <SyncIndicator />
                        <button
                            type="button"
                            onClick={handle_close}
                            class="p-1 text-base-content/40 hover:text-base-content transition-colors"
                        >
                            <X class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto">
                    <AccordionSection
                        id="trading"
                        title="TRADING"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <TradingSection />
                    </AccordionSection>

                    <AccordionSection
                        id="terminal"
                        title="TERMINAL"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <TerminalSection />
                    </AccordionSection>

                    <AccordionSection
                        id="chart"
                        title="CHART"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <ChartSection />
                    </AccordionSection>

                    <AccordionSection
                        id="news"
                        title="NEWS"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <NewsSection />
                    </AccordionSection>

                    <AccordionSection
                        id="keywords"
                        title="KEYWORDS"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <KeywordSection />
                    </AccordionSection>

                    <AccordionSection
                        id="shortcuts"
                        title="SHORTCUTS"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <ShortcutsSection />
                    </AccordionSection>

                    <AccordionSection
                        id="botting"
                        title="BOTTING"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <BottingSection />
                    </AccordionSection>

                    <AccordionSection
                        id="backup"
                        title="BACKUP & RESTORE"
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <BackupSection />
                    </AccordionSection>
                </div>
            </div>
        </div>
    );
}
