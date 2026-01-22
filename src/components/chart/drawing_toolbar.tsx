import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
    MousePointer2,
    Ruler,
    Minus,
    TrendingUp,
    Square,
    Pencil,
    Trash2,
    Eraser,
    ChevronRight,
    ChevronLeft,
} from 'lucide-preact';
import type { DrawingTool, DrawingToolbarProps, ToolButtonProps } from '../../types/drawing.types';
import { ColorPicker } from './color_picker';
import { DRAWING_TOOLBAR_CONSTANTS } from '../../config/chart.constants';

const ToolButton = memo(function ToolButton({
    active,
    on_click,
    children,
    title,
    aria_label,
}: ToolButtonProps) {
    return (
        <button
            type="button"
            onClick={on_click}
            title={title}
            aria-label={aria_label || title}
            aria-pressed={active}
            class={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                active
                    ? 'bg-primary/20 text-primary'
                    : 'text-base-content/50 hover:text-base-content/70 hover:bg-base-300/50'
            }`}
        >
            {children}
        </button>
    );
});

const ColorIcon = memo(function ColorIcon({ color }: { color: string }) {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" fill={color} stroke={color} />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity="0.3" />
        </svg>
    );
});

const ICON_CLASS = 'w-4 h-4';

const TOOLS: readonly {
    tool: DrawingTool;
    Icon: preact.FunctionComponent;
    title: string;
    aria_label: string;
}[] = [
    {
        tool: 'select',
        Icon: () => <MousePointer2 class={ICON_CLASS} />,
        title: 'Select (Esc)',
        aria_label: 'Select drawing tool',
    },
    {
        tool: 'measure',
        Icon: () => <Ruler class={ICON_CLASS} />,
        title: 'Measure',
        aria_label: 'Measure price and time',
    },
    {
        tool: 'horizontal_line',
        Icon: () => <Minus class={ICON_CLASS} />,
        title: 'Horizontal Line',
        aria_label: 'Draw horizontal line',
    },
    {
        tool: 'trend_line',
        Icon: () => <TrendingUp class={ICON_CLASS} />,
        title: 'Trend Line',
        aria_label: 'Draw trend line',
    },
    {
        tool: 'rectangle',
        Icon: () => <Square class={ICON_CLASS} />,
        title: 'Rectangle',
        aria_label: 'Draw rectangle',
    },
    {
        tool: 'brush',
        Icon: () => <Pencil class={ICON_CLASS} />,
        title: 'Brush',
        aria_label: 'Freehand brush tool',
    },
] as const;

export const DrawingToolbar = memo(function DrawingToolbar({
    active_tool,
    on_tool_change,
    on_delete_selected,
    on_clear_all,
    selected_id,
    has_drawings,
    selected_color = '#2962ff',
    on_color_change,
}: DrawingToolbarProps) {
    const [show_color_picker, set_show_color_picker] = useState(false);
    const [is_collapsed, set_is_collapsed] = useState(false);
    const [is_expanded, set_is_expanded] = useState(false);
    const toolbar_ref = useRef<HTMLDivElement>(null);
    const container_ref = useRef<HTMLDivElement>(null);
    const [focused_index, set_focused_index] = useState(-1);

    useEffect(() => {
        const container = container_ref.current?.parentElement;
        if (!container) return;

        const check_height = () => {
            const height = container.clientHeight;
            set_is_collapsed(height < DRAWING_TOOLBAR_CONSTANTS.COLLAPSE_HEIGHT_THRESHOLD);
            if (height >= DRAWING_TOOLBAR_CONSTANTS.COLLAPSE_HEIGHT_THRESHOLD) {
                set_is_expanded(false);
            }
        };

        const observer = new ResizeObserver(check_height);
        observer.observe(container);
        check_height();

        return () => observer.disconnect();
    }, []);

    const get_all_buttons = useCallback(() => {
        if (!toolbar_ref.current) return [];
        return Array.from(toolbar_ref.current.querySelectorAll('button'));
    }, []);

    const handle_keydown = useCallback(
        (e: KeyboardEvent) => {
            const buttons = get_all_buttons();
            if (buttons.length === 0) return;

            let new_index = focused_index;

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                new_index = focused_index < buttons.length - 1 ? focused_index + 1 : 0;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                new_index = focused_index > 0 ? focused_index - 1 : buttons.length - 1;
            } else if (e.key === 'Home') {
                e.preventDefault();
                new_index = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                new_index = buttons.length - 1;
            }

            if (new_index !== focused_index && new_index >= 0) {
                set_focused_index(new_index);
                buttons[new_index]?.focus();
            }
        },
        [focused_index, get_all_buttons]
    );

    useEffect(() => {
        const toolbar = toolbar_ref.current;
        if (!toolbar) return;

        const handle_focus_in = (e: FocusEvent) => {
            const buttons = get_all_buttons();
            const index = buttons.indexOf(e.target as HTMLButtonElement);
            if (index >= 0) set_focused_index(index);
        };

        toolbar.addEventListener('focusin', handle_focus_in);
        return () => toolbar.removeEventListener('focusin', handle_focus_in);
    }, [get_all_buttons]);

    const handle_tool_click = useCallback(
        (tool: DrawingTool) => {
            if (active_tool === tool && tool !== 'select') {
                on_tool_change('select');
            } else {
                on_tool_change(tool);
            }
        },
        [active_tool, on_tool_change]
    );

    const handle_color_toggle = useCallback(() => {
        set_show_color_picker((prev) => !prev);
    }, []);

    const toggle_expand = useCallback(() => {
        set_is_expanded((prev) => !prev);
    }, []);

    if (is_collapsed && !is_expanded) {
        return (
            <div ref={container_ref} class="absolute left-3 top-[96px] z-30">
                <button
                    type="button"
                    onClick={toggle_expand}
                    class="w-10 h-10 flex items-center justify-center rounded-lg bg-base-200/90 backdrop-blur-sm text-base-content/50 hover:text-base-content/70 hover:bg-base-300/90 transition-colors"
                    title="Expand drawing tools"
                    aria-label="Expand drawing tools"
                >
                    <ChevronRight class={ICON_CLASS} />
                </button>
            </div>
        );
    }

    if (is_collapsed && is_expanded) {
        return (
            <div ref={container_ref} class="absolute left-3 top-[96px] z-30">
                <div class="flex gap-1 bg-base-200/90 rounded-lg p-1 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={toggle_expand}
                        class="w-8 h-8 flex items-center justify-center rounded text-base-content/50 hover:text-base-content/70 hover:bg-base-300/50 transition-colors"
                        title="Collapse drawing tools"
                        aria-label="Collapse drawing tools"
                    >
                        <ChevronLeft class={ICON_CLASS} />
                    </button>
                    <div class="border-l border-base-content/10 mx-0.5" />
                    {TOOLS.map(({ tool, Icon, title, aria_label }) => (
                        <ToolButton
                            key={tool}
                            active={active_tool === tool}
                            on_click={() => handle_tool_click(tool)}
                            title={title}
                            aria_label={aria_label}
                        >
                            <Icon />
                        </ToolButton>
                    ))}
                    {selected_id && (
                        <>
                            <div class="border-l border-base-content/10 mx-0.5" />
                            <ToolButton
                                active={show_color_picker}
                                on_click={handle_color_toggle}
                                title="Change Color"
                                aria_label="Change selected drawing color"
                            >
                                <ColorIcon color={selected_color} />
                            </ToolButton>
                            <ToolButton
                                active={false}
                                on_click={on_delete_selected}
                                title="Delete Selected"
                                aria_label="Delete selected drawing"
                            >
                                <Trash2 class={ICON_CLASS} />
                            </ToolButton>
                        </>
                    )}
                    {has_drawings && (
                        <>
                            <div class="border-l border-base-content/10 mx-0.5" />
                            <ToolButton
                                active={false}
                                on_click={on_clear_all}
                                title="Clear All Drawings"
                                aria_label="Clear all drawings from chart"
                            >
                                <Eraser class={ICON_CLASS} />
                            </ToolButton>
                        </>
                    )}
                </div>
                {show_color_picker && on_color_change && selected_id && (
                    <div class="absolute left-0 top-full mt-2 z-10">
                        <ColorPicker color={selected_color} on_change={on_color_change} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={container_ref} class="absolute left-3 top-[96px] z-30">
            <div
                ref={toolbar_ref}
                role="toolbar"
                aria-label="Drawing tools"
                onKeyDown={handle_keydown}
                class="flex flex-col gap-1 bg-base-200/90 rounded-lg p-1 backdrop-blur-sm"
            >
                {TOOLS.map(({ tool, Icon, title, aria_label }) => (
                    <ToolButton
                        key={tool}
                        active={active_tool === tool}
                        on_click={() => handle_tool_click(tool)}
                        title={title}
                        aria_label={aria_label}
                    >
                        <Icon />
                    </ToolButton>
                ))}
                {selected_id && (
                    <>
                        <div class="border-t border-base-content/10 my-1" />
                        <ToolButton
                            active={show_color_picker}
                            on_click={handle_color_toggle}
                            title="Change Color"
                            aria_label="Change selected drawing color"
                        >
                            <ColorIcon color={selected_color} />
                        </ToolButton>
                        <ToolButton
                            active={false}
                            on_click={on_delete_selected}
                            title="Delete Selected"
                            aria_label="Delete selected drawing"
                        >
                            <Trash2 class={ICON_CLASS} />
                        </ToolButton>
                    </>
                )}
                {has_drawings && (
                    <>
                        <div class="border-t border-base-content/10 my-1" />
                        <ToolButton
                            active={false}
                            on_click={on_clear_all}
                            title="Clear All Drawings"
                            aria_label="Clear all drawings from chart"
                        >
                            <Eraser class={ICON_CLASS} />
                        </ToolButton>
                    </>
                )}
            </div>
            {show_color_picker && on_color_change && selected_id && (
                <div class="absolute left-full top-0 ml-2 z-10">
                    <ColorPicker color={selected_color} on_change={on_color_change} />
                </div>
            )}
        </div>
    );
});
