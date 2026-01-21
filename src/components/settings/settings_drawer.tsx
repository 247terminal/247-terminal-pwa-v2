import { useState, useRef, useCallback } from 'preact/hooks';
import {
    ChevronDown,
    Newspaper,
    DollarSign,
    LogOut,
    Moon,
    Sun,
    Lock,
    LockOpen,
} from 'lucide-preact';
import { use_click_outside, use_escape_key } from '@/hooks';
import { clear_token } from '@/services/auth/session.service';
import { current_theme, toggle_theme } from '@/hooks/use_theme';
import { layout_locked, toggle_layout_lock } from '@/stores/layout_lock_store';
import type {
    SettingsSectionId,
    SettingsDrawerProps,
    AccordionSectionProps,
} from '@/types/settings.types';
import { NewsTradingSection } from './news_trading_section';
import { TradingSection } from './trading_section';
import { TerminalSection } from './terminal_section';
import { ChartSection } from './chart_section';
import { NewsSection } from './news_section';
import { KeywordSection } from './keyword_section';
import { ShortcutsSection } from './shortcuts_section';
import { BottingSection } from './botting_section';
import { BackupSection } from './backup_section';

function AccordionSection({
    id,
    title,
    icon,
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
                class={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                    is_expanded ? 'bg-primary/10' : 'hover:bg-base-200/50'
                }`}
            >
                <div class="flex items-center gap-2">
                    {icon && <span class="text-primary">{icon}</span>}
                    <span class="text-xs font-medium tracking-wide text-base-content">{title}</span>
                </div>
                <ChevronDown
                    class={`w-4 h-4 text-base-content/40 transition-transform ${is_expanded ? 'rotate-180' : ''}`}
                />
            </button>
            {is_expanded && <div class="px-4 pt-3 pb-4">{children}</div>}
        </div>
    );
}

export function SettingsDrawer({ is_open, on_close }: SettingsDrawerProps) {
    const drawer_ref = useRef<HTMLDivElement>(null);
    const [expanded_section, set_expanded_section] = useState<SettingsSectionId | null>(
        'news_trading'
    );

    const handle_close = useCallback(() => {
        on_close();
    }, [on_close]);

    use_click_outside(drawer_ref, handle_close);
    use_escape_key(handle_close);

    if (!is_open) return null;

    function toggle_section(id: SettingsSectionId): void {
        set_expanded_section((prev) => (prev === id ? null : id));
    }

    return (
        <div class="fixed inset-0 z-50">
            <div class="absolute inset-0 bg-black/40" />
            <div
                ref={drawer_ref}
                class="absolute top-0 right-0 h-full w-1/4 min-w-80 bg-base-100 shadow-xl flex flex-col animate-slide-in-right"
            >
                <div class="flex-1 overflow-y-auto">
                    <AccordionSection
                        id="news_trading"
                        title="NEWS TRADING"
                        icon={<Newspaper class="w-4 h-4" />}
                        expanded_section={expanded_section}
                        on_toggle={toggle_section}
                    >
                        <NewsTradingSection />
                    </AccordionSection>

                    <AccordionSection
                        id="trading"
                        title="TRADING"
                        icon={<DollarSign class="w-4 h-4" />}
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

                <div class="px-4 py-3 flex items-center justify-between">
                    <div class="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={toggle_theme}
                            class="p-1.5 text-base-content/50 hover:text-base-content transition-colors"
                        >
                            {current_theme.value === 'terminal-dark' ? (
                                <Moon class="w-3.5 h-3.5" />
                            ) : (
                                <Sun class="w-3.5 h-3.5" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={toggle_layout_lock}
                            class="p-1.5 text-base-content/50 hover:text-base-content transition-colors"
                        >
                            {layout_locked.value ? (
                                <Lock class="w-3.5 h-3.5" />
                            ) : (
                                <LockOpen class="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            clear_token();
                            window.location.reload();
                        }}
                        class="p-1.5 text-base-content/50 hover:text-error transition-colors"
                    >
                        <LogOut class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
