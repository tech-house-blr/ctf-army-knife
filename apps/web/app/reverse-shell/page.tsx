"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";
import {
    COMMAND_TYPES,
    ENCODINGS,
    OS_FILTERS,
    buildCommand,
    buildListener,
    filterCommands,
    listeners,
    shells,
    type CommandType,
    type Encoding,
    type OsFilter,
} from "@/lib/tools/revshells";
import { readPrefs, serverPrefs, setPrefs, subscribePrefs } from "@/lib/tools/revshells/prefs.ts";

function parsePort(value: string): number {
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) && n >= 0 && n <= 65535 ? n : 9001;
}

/** Copy button that briefly confirms, degrading quietly without clipboard access. */
function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    return (
        <button
            type="button"
            className="btn btn-quiet h-8 min-h-8 px-2.5 text-[0.8333rem]"
            disabled={disabled}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => setCopied(false), 1200);
                } catch {
                    /* clipboard unavailable: no-op */
                }
            }}
        >
            {copied ? "Copied" : label}
        </button>
    );
}

/** A labelled field wrapper. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="field-label">{label}</span>
            {children}
        </label>
    );
}

export default function ReverseShellGenerator() {
    // Connection details persist per-browser; the server snapshot is the
    // defaults, so there is no hydration mismatch.
    const { ip, port, shell, encoding } = useSyncExternalStore(subscribePrefs, readPrefs, serverPrefs);
    const setIp = (ip: string) => setPrefs({ ip });
    const setPort = (port: string) => setPrefs({ port });
    const setShell = (shell: string) => setPrefs({ shell });
    const setEncoding = (encoding: Encoding) => setPrefs({ encoding });

    const [os, setOs] = useState<OsFilter>("all");
    const [type, setType] = useState<CommandType>("ReverseShell");
    const [selectedName, setSelectedName] = useState<string>("Bash -i");
    const [listenerName, setListenerName] = useState<string>(listeners[0]?.name ?? "");

    const portNumber = parsePort(port);
    const commandList = useMemo(() => filterCommands(type, os), [type, os]);
    const selected = commandList.find((c) => c.name === selectedName) ?? commandList[0];
    const listener = listeners.find((l) => l.name === listenerName) ?? listeners[0];

    const output = selected ? buildCommand(selected, { ip, port: portNumber, shell, encoding }) : "";
    const listenerResult = listener ? buildListener(listener, { ip, port: portNumber, selected }) : undefined;
    const listenerCommand = listenerResult
        ? (listenerResult.needsSudo ? "sudo " : "") + listenerResult.command
        : "";

    return (
        <ToolPage>
            <PageHeader slug="reverse-shell" />

            <p className="mt-2 max-w-3xl text-[0.9rem] text-fg-3">
                Generates reverse, bind, MSFVenom and HoaxShell payloads with matching listeners. For authorized
                security testing, CTFs and lab environments only — don&rsquo;t run these against systems you are not
                permitted to test.
            </p>

            {/* Connection details */}
            <section className="panel mt-6 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
                <Field label="IP / RHOST">
                    <input
                        className="field font-mono"
                        value={ip}
                        onChange={(e) => setIp(e.target.value.replace(/[^a-zA-Z0-9.\-:]/g, ""))}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                    />
                </Field>
                <Field label="Port">
                    <input
                        className="field font-mono"
                        value={port}
                        inputMode="numeric"
                        onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                    />
                </Field>
                <Field label="Shell">
                    <select className="field" value={shell} onChange={(e) => setShell(e.target.value)}>
                        {shells.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Encoding">
                    <select className="field" value={encoding} onChange={(e) => setEncoding(e.target.value as Encoding)}>
                        {ENCODINGS.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Operating system">
                    <select className="field" value={os} onChange={(e) => setOs(e.target.value as OsFilter)}>
                        {OS_FILTERS.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Field>
            </section>

            {/* Listener */}
            <section className="panel mt-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Field label="Listener">
                        <select
                            className="field w-full sm:w-64"
                            value={listener?.name ?? ""}
                            onChange={(e) => setListenerName(e.target.value)}
                        >
                            {listeners.map((l) => (
                                <option key={l.name} value={l.name}>
                                    {l.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <CopyButton text={listenerCommand} disabled={!listenerCommand} />
                </div>
                {listenerCommand ? (
                    <pre className="mt-3 overflow-x-auto rounded-md bg-inset p-3 font-mono text-[0.85rem] leading-relaxed text-fg">
                        {listenerCommand}
                    </pre>
                ) : null}
                {listenerResult?.warning ? (
                    <p className="mt-2 text-[0.85rem] text-danger">{listenerResult.warning}</p>
                ) : null}
            </section>

            {/* Command family tabs */}
            <div className="mt-6 flex flex-wrap gap-1.5">
                {COMMAND_TYPES.map((t) => {
                    const active = t.id === type;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setType(t.id)}
                            aria-pressed={active}
                            className={`rounded-md px-3 py-1.5 text-[0.875rem] font-medium transition-colors ${
                                active ? "bg-signal text-on-signal" : "bg-raised/60 text-fg-2 hover:bg-raised hover:text-fg"
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Payload list + generated command */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,19rem)_1fr]">
                <ul className="panel max-h-[28rem] overflow-y-auto p-1.5">
                    {commandList.length === 0 ? (
                        <li className="px-3 py-2 text-[0.875rem] text-fg-3">No commands for this filter.</li>
                    ) : (
                        commandList.map((c) => {
                            const active = c.name === selected?.name;
                            return (
                                <li key={c.name}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedName(c.name)}
                                        aria-current={active ? "true" : undefined}
                                        className={`w-full truncate rounded-md px-3 py-1.5 text-left text-[0.875rem] transition-colors ${
                                            active
                                                ? "bg-signal-soft font-medium text-fg"
                                                : "text-fg-2 hover:bg-raised/60 hover:text-fg"
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>

                <section className="panel flex min-h-[12rem] flex-col p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="truncate font-display text-lg">{selected?.name ?? "—"}</h2>
                        <CopyButton text={output} disabled={!output} />
                    </div>
                    <pre className="mt-3 flex-1 overflow-auto rounded-md bg-inset p-3 font-mono text-[0.85rem] leading-relaxed whitespace-pre-wrap text-fg">
                        {output || "Select a payload."}
                    </pre>
                </section>
            </div>
        </ToolPage>
    );
}
