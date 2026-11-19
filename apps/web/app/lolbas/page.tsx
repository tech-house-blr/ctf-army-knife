"use client";

import { useMemo, useState } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";
import { CopyButton, Field } from "@/components/tool-ui";
import {
    CATEGORY_ORDER,
    DEFAULT_VARIABLES,
    PRIVILEGE_LEVELS,
    TYPES,
    commandsFor,
    expand,
    expandSegments,
    isWebLink,
    linkLabel,
    mitreUrl,
    searchEntries,
    typeLabel,
    type CategoryId,
    type Command,
    type DetectionKind,
    type Entry,
    type Filters,
    type PrivilegeLevel,
    type TypeId,
    type Variables,
} from "@/lib/tools/lolbas";

/** Text with `inline code` spans, which upstream descriptions use. */
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

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-fg underline">
            {children}
        </a>
    );
}

/** A link if it is one, plain text otherwise. */
function MaybeLink({ value }: { value: string }) {
    return isWebLink(value) ? <ExternalLink href={value}>{linkLabel(value)}</ExternalLink> : <Inline text={value} />;
}

function Badge({ children }: { children: React.ReactNode }) {
    return <span className="rounded bg-raised/70 px-1.5 py-0.5 text-[0.75rem] text-fg-3">{children}</span>;
}

/** A command with its placeholders expanded and highlighted; copies the expanded text. */
function CommandCode({ command, variables }: { command: string; variables: Variables }) {
    const segments = expandSegments(command, variables);
    return (
        <div className="relative mt-2">
            <pre className="overflow-x-auto rounded-md bg-inset p-3 pr-20 font-mono text-[0.85rem] leading-relaxed whitespace-pre text-fg">
                {segments.map((segment, i) =>
                    segment.hint ? (
                        <span key={i} title={segment.hint} className="rounded-sm bg-signal-soft">
                            {segment.text}
                        </span>
                    ) : (
                        segment.text
                    ),
                )}
            </pre>
            <div className="absolute top-1.5 right-1.5">
                <CopyButton text={expand(command, variables)} />
            </div>
        </div>
    );
}

function CommandView({ command, variables }: { command: Command; variables: Variables }) {
    const technique = mitreUrl(command.mitreId);
    return (
        <li className="mt-5 border-t border-line pt-4 first:mt-3 first:border-t-0 first:pt-0">
            <p className="text-[0.875rem] leading-relaxed text-fg-2">
                <Inline text={command.description} />
            </p>
            <CommandCode command={command.command} variables={variables} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-signal-soft px-1.5 py-0.5 text-[0.75rem] text-fg">{command.category}</span>
                <Badge>{command.privileges}</Badge>
                {technique ? (
                    <a
                        href={technique}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-raised/70 px-1.5 py-0.5 font-mono text-[0.75rem] text-fg-3 hover:text-fg hover:underline"
                    >
                        {command.mitreId}
                    </a>
                ) : (
                    <Badge>{command.mitreId}</Badge>
                )}
                {command.tags?.map((tag) => (
                    <Badge key={`${tag.key}:${tag.value}`}>
                        {tag.key}: {tag.value}
                    </Badge>
                ))}
            </div>
            <dl className="mt-2 grid gap-x-3 gap-y-1 text-[0.8333rem] text-fg-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="font-medium text-fg-2">Use case</dt>
                <dd>
                    <Inline text={command.usecase} />
                </dd>
                <dt className="font-medium text-fg-2">Windows</dt>
                <dd>{command.os}</dd>
            </dl>
        </li>
    );
}

const DETECTION_LABELS: Record<DetectionKind, string> = {
    Sigma: "Sigma",
    Elastic: "Elastic",
    Splunk: "Splunk",
    BlockRule: "Block rule",
    Analysis: "Analysis",
    IOC: "IOC",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-6 border-t border-line pt-4">
            <h3 className="font-display text-base">{title}</h3>
            {children}
        </div>
    );
}

function LinkList({ links }: { links: string[] }) {
    return (
        <ul className="mt-2 space-y-1 text-[0.8333rem] text-fg-2">
            {links.map((link, i) => (
                <li key={i} className="min-w-0">
                    <MaybeLink value={link} />
                </li>
            ))}
        </ul>
    );
}

function EntryView({ entry, filters, variables }: { entry: Entry; filters: Filters; variables: Variables }) {
    const commands = commandsFor(entry, filters);
    const detection = entry.detection ?? [];
    const kinds = (Object.keys(DETECTION_LABELS) as DetectionKind[]).filter((kind) =>
        detection.some((item) => item.kind === kind),
    );
    return (
        <section className="panel min-w-0 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl break-words">{entry.name}</h2>
                <Badge>{typeLabel(entry.type)}</Badge>
            </div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-2">
                <Inline text={entry.description} />
            </p>
            {entry.aliases?.length ? (
                <p className="mt-1 text-[0.8333rem] text-fg-3">
                    Also known as <span className="font-mono">{entry.aliases.join(", ")}</span>
                </p>
            ) : null}

            <Section title={commands.length === entry.commands.length ? "Commands" : `Commands (${commands.length} of ${entry.commands.length})`}>
                <ul>
                    {commands.map((command, i) => (
                        <CommandView key={i} command={command} variables={variables} />
                    ))}
                </ul>
            </Section>

            {entry.paths.length ? (
                <Section title="Paths">
                    <ul className="mt-2 space-y-1 font-mono text-[0.8333rem] break-all text-fg-2">
                        {entry.paths.map((path, i) => (
                            <li key={i}>{path}</li>
                        ))}
                    </ul>
                </Section>
            ) : null}

            {kinds.length ? (
                <Section title="Detection">
                    <dl className="mt-2 grid gap-x-3 gap-y-2 text-[0.8333rem] sm:grid-cols-[auto_minmax(0,1fr)]">
                        {kinds.map((kind) => (
                            <div key={kind} className="contents">
                                <dt className="font-medium text-fg-2">{DETECTION_LABELS[kind]}</dt>
                                <dd className="min-w-0">
                                    <ul className="space-y-1 text-fg-2">
                                        {detection
                                            .filter((item) => item.kind === kind)
                                            .map((item, i) => (
                                                <li key={i}>
                                                    <MaybeLink value={item.value} />
                                                </li>
                                            ))}
                                    </ul>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Section>
            ) : null}

            {entry.resources?.length || entry.codeSamples?.length ? (
                <Section title="Resources">
                    {entry.codeSamples?.length ? (
                        <>
                            <p className="mt-2 text-[0.8333rem] font-medium text-fg-2">Code samples</p>
                            <LinkList links={entry.codeSamples} />
                        </>
                    ) : null}
                    {entry.resources?.length ? (
                        <>
                            {entry.codeSamples?.length ? (
                                <p className="mt-3 text-[0.8333rem] font-medium text-fg-2">References</p>
                            ) : null}
                            <LinkList links={entry.resources} />
                        </>
                    ) : null}
                </Section>
            ) : null}

            <Section title="Credits">
                <p className="mt-2 text-[0.8333rem] text-fg-3">
                    Entry by {entry.author}, {entry.created}.
                </p>
                {entry.acknowledgements?.length ? (
                    <p className="mt-1 text-[0.8333rem] text-fg-3">
                        Acknowledgements:{" "}
                        {entry.acknowledgements
                            .map(({ person, handle }) => (handle ? `${person} (${handle})` : person))
                            .join(", ")}
                    </p>
                ) : null}
            </Section>
        </section>
    );
}

export default function Lolbas() {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<CategoryId | "">("");
    const [type, setType] = useState<TypeId | "">("");
    const [privilege, setPrivilege] = useState<PrivilegeLevel | "">("");
    const [selectedName, setSelectedName] = useState("");
    const [variables, setVariables] = useState<Variables>({ ...DEFAULT_VARIABLES });

    const filters: Filters = useMemo(
        () => ({
            query,
            category: category || undefined,
            type: type || undefined,
            privilege: privilege || undefined,
        }),
        [query, category, type, privilege],
    );
    const results = useMemo(() => searchEntries(filters), [filters]);
    const selected = results.find((entry) => entry.name === selectedName) ?? results[0];
    const setVariable = (key: keyof Variables, value: string) => setVariables((v) => ({ ...v, [key]: value }));

    return (
        <ToolPage>
            <PageHeader slug="lolbas" />

            <p className="mt-2 max-w-3xl text-[0.9rem] text-fg-3">
                Windows binaries, scripts and libraries that can be abused to execute code, download or copy files,
                bypass application control, dump credentials and more, from the LOLBAS Project. For authorized security
                testing, CTFs and lab environments only.
            </p>

            <section className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Binary or ATT&CK ID">
                    <input
                        className="field font-mono"
                        type="search"
                        placeholder="e.g. certutil, T1218"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                    />
                </Field>
                <Field label="Category">
                    <select
                        className="field"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CategoryId | "")}
                    >
                        <option value="">Any category</option>
                        {CATEGORY_ORDER.map((id) => (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Type">
                    <select className="field" value={type} onChange={(e) => setType(e.target.value as TypeId | "")}>
                        <option value="">Any type</option>
                        {TYPES.map(({ id, label }) => (
                            <option key={id} value={id}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Privileges">
                    <select
                        className="field"
                        value={privilege}
                        onChange={(e) => setPrivilege(e.target.value as PrivilegeLevel | "")}
                    >
                        <option value="">Any privileges</option>
                        {PRIVILEGE_LEVELS.map(({ id, label }) => (
                            <option key={id} value={id}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
            </section>

            <details className="panel mt-4 p-4">
                <summary className="cursor-pointer text-[0.875rem] font-medium">Fill in placeholders</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Remote URL base">
                        <input
                            className="field font-mono"
                            value={variables.url}
                            onChange={(e) => setVariable("url", e.target.value)}
                            placeholder={DEFAULT_VARIABLES.url}
                            spellCheck={false}
                        />
                    </Field>
                    <Field label="Local folder">
                        <input
                            className="field font-mono"
                            value={variables.dir}
                            onChange={(e) => setVariable("dir", e.target.value)}
                            placeholder={DEFAULT_VARIABLES.dir}
                            spellCheck={false}
                        />
                    </Field>
                    <Field label="SMB share">
                        <input
                            className="field font-mono"
                            value={variables.smb}
                            onChange={(e) => setVariable("smb", e.target.value)}
                            placeholder={DEFAULT_VARIABLES.smb}
                            spellCheck={false}
                        />
                    </Field>
                    <Field label="Command">
                        <input
                            className="field font-mono"
                            value={variables.cmd}
                            onChange={(e) => setVariable("cmd", e.target.value)}
                            placeholder={DEFAULT_VARIABLES.cmd}
                            spellCheck={false}
                        />
                    </Field>
                </div>
                <p className="mt-2 text-[0.8333rem] text-fg-3">
                    Highlighted parts of each command are placeholders: hover one to see what it stands for. URLs, local
                    and SMB paths are built from these values plus an example file name (file.exe, file.dll, ...);
                    empty fields fall back to the examples. Text is substituted as typed, so quote paths with spaces
                    yourself.
                </p>
            </details>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                <div>
                    <p className="mb-1.5 px-1 text-[0.8333rem] text-fg-3" aria-live="polite">
                        {results.length} {results.length === 1 ? "entry" : "entries"}
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
                    <EntryView entry={selected} filters={filters} variables={variables} />
                ) : (
                    <section className="panel p-4 text-[0.875rem] text-fg-3">
                        Try a different search, or clear the category, type and privilege filters.
                    </section>
                )}
            </div>
        </ToolPage>
    );
}
