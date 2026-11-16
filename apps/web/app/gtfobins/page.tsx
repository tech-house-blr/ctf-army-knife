"use client";

import { useMemo, useState } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";
import { CopyButton, Field } from "@/components/tool-ui";
import {
    DEFAULT_VARIABLES,
    FUNCTION_ORDER,
    attackerSide,
    contextInfo,
    exampleCode,
    exampleComments,
    exampleNotes,
    examplesFor,
    functionsOf,
    getEntry,
    getFunction,
    resolveEntry,
    searchEntries,
    substitute,
    type ContextId,
    type Entry,
    type Example,
    type FunctionId,
    type Variables,
} from "@/lib/tools/gtfobins";

/** Text with `inline code` spans, which upstream comments use. */
function Inline({ text }: { text: string }) {
    return (
        <>
            {text.split("`").map((part, i) =>
                i % 2 ? (
                    <code key={i} className="rounded bg-inset px-1 py-0.5 font-mono text-[0.85em] text-fg">
                        {part}
                    </code>
                ) : (
                    part
                ),
            )}
        </>
    );
}

/** Text with ``` fenced blocks, which the library-load payload note uses. */
function Rich({ text }: { text: string }) {
    return (
        <>
            {text.split(/```\w*\n?/).map((part, i) =>
                i % 2 ? (
                    <Code key={i} code={part.trim()} />
                ) : (
                    part.trim() &&
                    part
                        .trim()
                        .split(/\n{2,}/)
                        .map((paragraph, j) => (
                            <p key={`${i}-${j}`} className="mt-2 text-[0.875rem] leading-relaxed text-fg-2">
                                <Inline text={paragraph} />
                            </p>
                        ))
                ),
            )}
        </>
    );
}

function Code({ code }: { code: string }) {
    return (
        <div className="relative mt-2">
            <pre className="overflow-x-auto rounded-md bg-inset p-3 pr-20 font-mono text-[0.85rem] leading-relaxed whitespace-pre text-fg">
                {code}
            </pre>
            <div className="absolute top-1.5 right-1.5">
                <CopyButton text={code} />
            </div>
        </div>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return <span className="rounded bg-raised/70 px-1.5 py-0.5 text-[0.75rem] text-fg-3">{children}</span>;
}

function ExampleView({
    fn,
    example,
    context,
    variables,
    onOpen,
}: {
    fn: FunctionId;
    example: Example;
    context?: ContextId;
    variables: Variables;
    onOpen: (name: string) => void;
}) {
    const side = attackerSide(fn, example);
    const comments = exampleComments(example, context);
    const notes = exampleNotes(fn, example, context);
    return (
        <li className="mt-4 first:mt-3">
            {comments.map((comment) => (
                <p key={comment} className="mt-2 text-[0.875rem] leading-relaxed text-fg-2 first:mt-0">
                    <Inline text={comment} />
                </p>
            ))}
            <Code code={substitute(exampleCode(example, context), variables)} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {context ? null : Object.keys(example.contexts).map((id) => <Badge key={id}>{id}</Badge>)}
                {example.version ? <Badge>{example.version}</Badge> : null}
                {example.from ? (
                    <button
                        type="button"
                        className="rounded bg-signal-soft px-1.5 py-0.5 text-[0.75rem] text-fg hover:underline"
                        onClick={() => onOpen(example.from!)}
                    >
                        from {example.from}
                    </button>
                ) : null}
            </div>
            {notes.map((note) => (
                <p key={note} className="mt-2 text-[0.8333rem] leading-relaxed text-fg-3">
                    <Inline text={note} />
                </p>
            ))}
            {side ? (
                <div className="mt-3 border-l-2 border-line pl-3">
                    <p className="text-[0.8333rem] text-fg-3">
                        <Inline text={side.comment} />
                    </p>
                    {side.code ? <Code code={substitute(side.code, variables)} /> : null}
                </div>
            ) : null}
        </li>
    );
}

function EntryView({
    entry,
    fn,
    context,
    variables,
    onOpen,
}: {
    entry: Entry;
    fn?: FunctionId;
    context?: ContextId;
    variables: Variables;
    onOpen: (name: string) => void;
}) {
    const resolved = resolveEntry(entry);
    const shown = functionsOf(entry).filter((id) => (!fn || id === fn) && examplesFor(entry, id, context).length);
    return (
        <section className="panel min-w-0 p-4">
            <h2 className="font-display text-xl break-words">{entry.name}</h2>
            {resolved !== entry ? (
                <p className="mt-1 text-[0.875rem] text-fg-3">
                    Works like{" "}
                    <button type="button" className="text-fg underline" onClick={() => onOpen(resolved.name)}>
                        {resolved.name}
                    </button>
                    ; the examples below use that name.
                </p>
            ) : null}
            {resolved.comment ? (
                <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-2">
                    <Inline text={resolved.comment} />
                </p>
            ) : null}
            {shown.length === 0 ? (
                <p className="mt-4 text-[0.875rem] text-fg-3">No examples match these filters.</p>
            ) : null}
            {shown.map((id) => {
                const info = getFunction(id);
                return (
                    <div key={id} className="mt-6 border-t border-line pt-4">
                        <h3 className="font-display text-base">{info.label}</h3>
                        <p className="mt-1 text-[0.8333rem] text-fg-3">{info.description}</p>
                        {info.extra?.payload ? <Rich text={info.extra.payload} /> : null}
                        <ul>
                            {examplesFor(entry, id, context).map((example, i) => (
                                <ExampleView
                                    key={i}
                                    fn={id}
                                    example={example}
                                    context={context}
                                    variables={variables}
                                    onOpen={onOpen}
                                />
                            ))}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}

export default function GtfoBins() {
    const [query, setQuery] = useState("");
    const [fn, setFn] = useState<FunctionId | "">("");
    const [context, setContext] = useState<ContextId | "">("");
    const [selectedName, setSelectedName] = useState("");
    const [variables, setVariables] = useState<Variables>({ ...DEFAULT_VARIABLES });

    const results = useMemo(
        () => searchEntries({ query, fn: fn || undefined, context: context || undefined }),
        [query, fn, context],
    );
    const selected = results.find((entry) => entry.name === selectedName) ?? results[0];

    // Following a link (an alias target or an inherited-from entry) may leave
    // the current filters, so it clears them rather than showing nothing.
    const open = (name: string) => {
        if (!getEntry(name)) return;
        setQuery("");
        setFn("");
        setContext("");
        setSelectedName(name);
    };
    const setVariable = (key: keyof Variables, value: string) => setVariables((v) => ({ ...v, [key]: value }));

    return (
        <ToolPage>
            <PageHeader slug="gtfobins" />

            <p className="mt-2 max-w-3xl text-[0.9rem] text-fg-3">
                Unix executables that can be abused to escape restricted shells, escalate privileges, read and write
                files or move data, from the curated GTFOBins list. For authorized security testing, CTFs and lab
                environments only.
            </p>

            <section className="panel mt-6 grid gap-3 p-4 sm:grid-cols-3">
                <Field label="Executable">
                    <input
                        className="field font-mono"
                        type="search"
                        placeholder="Search, e.g. tar, vim, find"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                    />
                </Field>
                <Field label="Function">
                    <select className="field" value={fn} onChange={(e) => setFn(e.target.value as FunctionId | "")}>
                        <option value="">Any function</option>
                        {FUNCTION_ORDER.map((id) => (
                            <option key={id} value={id}>
                                {getFunction(id).label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Context">
                    <select
                        className="field"
                        value={context}
                        onChange={(e) => setContext(e.target.value as ContextId | "")}
                    >
                        <option value="">Any context</option>
                        {contextInfo.map((info) => (
                            <option key={info.id} value={info.id}>
                                {info.label}
                            </option>
                        ))}
                    </select>
                </Field>
                {context ? (
                    <p className="text-[0.8333rem] text-fg-3 sm:col-span-3">
                        {contextInfo.find((info) => info.id === context)?.description}
                    </p>
                ) : null}
            </section>

            <details className="panel mt-4 p-4">
                <summary className="cursor-pointer text-[0.875rem] font-medium">Fill in placeholders</summary>
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Field label="Attacker host">
                        <input
                            className="field font-mono"
                            value={variables.attacker}
                            onChange={(e) => setVariable("attacker", e.target.value.replace(/[^a-zA-Z0-9.\-:]/g, ""))}
                            spellCheck={false}
                        />
                    </Field>
                    <Field label="Port">
                        <input
                            className="field font-mono"
                            value={variables.port}
                            inputMode="numeric"
                            onChange={(e) => setVariable("port", e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                        />
                    </Field>
                    <Field label="Input file">
                        <input
                            className="field font-mono"
                            value={variables.input}
                            onChange={(e) => setVariable("input", e.target.value)}
                            spellCheck={false}
                        />
                    </Field>
                    <Field label="Output file">
                        <input
                            className="field font-mono"
                            value={variables.output}
                            onChange={(e) => setVariable("output", e.target.value)}
                            spellCheck={false}
                        />
                    </Field>
                </div>
                <p className="mt-2 text-[0.8333rem] text-fg-3">
                    Replaces the example host, port and file paths in every command shown. The text is substituted as
                    typed, so quote paths with spaces yourself.
                </p>
            </details>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                <div>
                    <p className="mb-1.5 px-1 text-[0.8333rem] text-fg-3" aria-live="polite">
                        {results.length} {results.length === 1 ? "executable" : "executables"}
                    </p>
                    <ul className="panel max-h-[32rem] overflow-y-auto p-1.5">
                        {results.length === 0 ? (
                            <li className="px-3 py-2 text-[0.875rem] text-fg-3">Nothing matches.</li>
                        ) : (
                            results.map((entry) => {
                                const active = entry.name === selected?.name;
                                return (
                                    <li key={entry.name}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedName(entry.name)}
                                            aria-current={active ? "true" : undefined}
                                            className={`w-full truncate rounded-md px-3 py-1.5 text-left font-mono text-[0.85rem] transition-colors ${
                                                active
                                                    ? "bg-signal-soft font-medium text-fg"
                                                    : "text-fg-2 hover:bg-raised/60 hover:text-fg"
                                            }`}
                                        >
                                            {entry.name}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>

                {selected ? (
                    <EntryView
                        entry={selected}
                        fn={fn || undefined}
                        context={context || undefined}
                        variables={variables}
                        onOpen={open}
                    />
                ) : (
                    <section className="panel p-4 text-[0.875rem] text-fg-3">
                        Try a different search, or clear the function and context filters.
                    </section>
                )}
            </div>
        </ToolPage>
    );
}
