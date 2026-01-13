import { useState, useRef, useEffect } from 'preact/hooks';
import {
    active_rig,
    all_rigs,
    switch_rig,
    create_rig,
    delete_rig,
    rename_rig,
    reset_to_default_rigs,
} from '../../stores/layout_store';

export function RigSelector() {
    const [is_open, set_is_open] = useState(false);
    const [is_creating, set_is_creating] = useState(false);
    const [new_rig_name, set_new_rig_name] = useState('');
    const [editing_id, set_editing_id] = useState<string | null>(null);
    const [edit_name, set_edit_name] = useState('');
    const container_ref = useRef<HTMLDivElement>(null);
    const input_ref = useRef<HTMLInputElement>(null);
    const edit_input_ref = useRef<HTMLInputElement>(null);

    const current_rig = active_rig.value;
    const rigs = all_rigs.value;

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                set_is_open(false);
                set_is_creating(false);
                set_editing_id(null);
            }
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, []);

    useEffect(() => {
        const handle_click_outside = (e: MouseEvent) => {
            if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
                set_is_open(false);
                set_is_creating(false);
                set_editing_id(null);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, []);

    useEffect(() => {
        if (is_creating && input_ref.current) {
            input_ref.current.focus();
        }
    }, [is_creating]);

    useEffect(() => {
        if (editing_id && edit_input_ref.current) {
            edit_input_ref.current.focus();
            edit_input_ref.current.select();
        }
    }, [editing_id]);

    const handle_create = () => {
        if (new_rig_name.trim()) {
            create_rig(new_rig_name.trim().toUpperCase());
            set_new_rig_name('');
            set_is_creating(false);
        }
    };

    const handle_switch = (id: string) => {
        switch_rig(id);
    };

    const handle_delete = (e: Event, id: string) => {
        e.stopPropagation();
        delete_rig(id);
    };

    const handle_start_edit = (e: Event, id: string, name: string) => {
        e.stopPropagation();
        set_editing_id(id);
        set_edit_name(name);
    };

    const handle_save_edit = () => {
        if (editing_id && edit_name.trim()) {
            rename_rig(editing_id, edit_name.trim().toUpperCase());
        }
        set_editing_id(null);
        set_edit_name('');
    };

    const handle_reset = () => {
        reset_to_default_rigs();
    };

    return (
        <div ref={container_ref} class="relative">
            <button
                onClick={() => set_is_open(!is_open)}
                class="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded text-xs text-primary/60 hover:bg-primary/20 hover:text-primary/80 transition-colors"
            >
                <svg class="w-3 h-3" viewBox="0 0 15 15" fill="currentColor">
                    <path d="m9 8.2l1 5.8h1.5c.5 0 .5 1 0 1h-8c-.5 0-.5-1 0-1H5l1-5.8q1.5 1.02 3 0M8.4 12H6.6l-.3 2h2.4zM8 9.25H7L6.75 11h1.5zm1.75-2.62c-.02.37-.19.96-.5 1.27L13 9.38v5.25c0 .5 1 .5 1 0V9.75c.75.25 1.25-1.05.5-1.3zM3.5 1C0 1-1 9.5 1.25 9.5c.75 0 1.99-3.9 1.99-3.9l2.01.75c0-.41.25-.97.52-1.26l-2.06-.78s.79-2.46.79-2.81c0-.25-.5-.5-1-.5m4 7C8.38 8 9 7.38 9 6.5C9 5.63 8.38 5 7.5 5C6.63 5 6 5.64 6 6.52C6 7.39 6.63 8 7.5 8"/>
                </svg>
                <span class="tracking-wider font-medium">{current_rig?.name || 'DEFAULT'}</span>
            </button>

            {is_open && (
                <div class="absolute top-full right-0 mt-1 w-56 bg-base-100 rounded shadow-lg z-50">
                    <div class="py-1">
                        {rigs.map((rig) => (
                            <div
                                key={rig.id}
                                onClick={() => handle_switch(rig.id)}
                                class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-base-200 transition-colors"
                            >
                                {editing_id === rig.id ? (
                                    <input
                                        ref={edit_input_ref}
                                        type="text"
                                        value={edit_name}
                                        onInput={(e) => set_edit_name((e.target as HTMLInputElement).value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handle_save_edit();
                                            if (e.key === 'Escape') set_editing_id(null);
                                        }}
                                        onBlur={handle_save_edit}
                                        onClick={(e) => e.stopPropagation()}
                                        class="flex-1 bg-base-300 px-2 py-0.5 rounded text-xs text-base-content outline-none"
                                    />
                                ) : (
                                    <>
                                        <span class={`text-xs tracking-wide ${rig.id === current_rig?.id ? 'text-primary font-bold' : 'text-base-content'}`}>{rig.name}</span>
                                        <div class="flex items-center gap-1">
                                            <button
                                                onClick={(e) => handle_start_edit(e, rig.id, rig.name)}
                                                class="p-1 text-base-content/40 hover:text-base-content transition-colors"
                                            >
                                                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            {rigs.length > 1 && (
                                                <button
                                                    onClick={(e) => handle_delete(e, rig.id)}
                                                    class="p-1 text-base-content/40 hover:text-error transition-colors"
                                                >
                                                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M18 6L6 18M6 6l12 12"/>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div>
                        {is_creating ? (
                            <div class="p-2">
                                <input
                                    ref={input_ref}
                                    type="text"
                                    value={new_rig_name}
                                    onInput={(e) => set_new_rig_name((e.target as HTMLInputElement).value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handle_create();
                                        if (e.key === 'Escape') set_is_creating(false);
                                    }}
                                    placeholder="ENTER RIG NAME..."
                                    class="w-full bg-base-300 px-3 py-1.5 rounded text-xs text-base-content placeholder:text-base-content/40 outline-none"
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => set_is_creating(true)}
                                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-base-200 transition-colors"
                            >
                                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                                <span>NEW RIG</span>
                            </button>
                        )}
                    </div>

                    <div>
                        <button
                            onClick={handle_reset}
                            class="w-full px-3 py-2 text-xs text-center text-base-content/50 bg-base-200/50 hover:bg-base-200 hover:text-base-content transition-colors"
                        >
                            RESET DEFAULT RIGS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
