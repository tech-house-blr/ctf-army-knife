"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import FileDrop from "@/components/file-drop";
import PageHeader, { ToolPage } from "@/components/page-header";
import {
    ANALYZER_INFO,
    DEFAULT_MAX_UPLOAD_BYTES,
    analyze,
    fetchUploadLimit,
    type AnalyzerResult,
    type FileInfo,
} from "@/lib/tools/aperisolve/client";

type Slot = { name: string; order: number; result?: AnalyzerResult; durationMs?: number };

const labelOf = (name: string) => ANALYZER_INFO[name]?.label ?? name;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function AperiSolvePage() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [deep, setDeep] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState<FileInfo | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [elapsed, setElapsed] = useState<number | null>(null);
    const [maxBytes, setMaxBytes] = useState(DEFAULT_MAX_UPLOAD_BYTES);
    const controller = useRef<AbortController | null>(null);

    // The limit is configured on the API (APERISOLVE_MAX_UPLOAD_BYTES), so ask it.
    useEffect(() => {
        const abort = new AbortController();
        void fetchUploadLimit(abort.signal).then((limit) => { if (limit) setMaxBytes(limit); });
        return () => abort.abort();
    }, []);
    useEffect(() => () => controller.current?.abort(), []);

    async function run(event: FormEvent) {
        event.preventDefault();
        if (!file) return;
        controller.current?.abort();
        const abort = new AbortController();
        controller.current = abort;
        setRunning(true);
        setError("");
        setInfo(null);
        setSlots([]);
        setElapsed(null);
        try {
            for await (const message of analyze(file, { password, deep, signal: abort.signal })) {
                if (message.event === "start") {
                    setInfo(message.file);
                    setSlots(message.analyzers.map(({ name, order }) => ({ name, order })));
                } else if (message.event === "result") {
                    setSlots((current) => current.map((slot) =>
                        slot.name === message.analyzer ? { ...slot, result: message.result, durationMs: message.duration_ms } : slot));
                } else {
                    setElapsed(message.duration_ms);
                }
            }
        } catch (problem) {
            if (!abort.signal.aborted) setError(problem instanceof Error ? problem.message : "The analysis failed.");
        } finally {
            if (controller.current === abort) setRunning(false);
        }
    }

    const withOutput = slots.filter((slot) => slot.result?.status === "ok");
    const pending = slots.filter((slot) => !slot.result);
    const quiet = slots.filter((slot) => slot.result && slot.result.status !== "ok");
    const finished = slots.length - pending.length;

    return (
        <ToolPage>
            <PageHeader slug="aperisolve" />

            <form onSubmit={run} className="panel mt-5 grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <FileDrop
                    file={file}
                    onFile={(chosen) => {
                        setFile(chosen);
                        setSlots([]);
                        setInfo(null);
                        setError("");
                    }}
                    maxBytes={maxBytes}
                    disabled={running}
                />
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="stego-password" className="field-label">Password for steghide and OutGuess</label>
                        <input
                            id="stego-password"
                            type="text"
                            value={password}
                            maxLength={256}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => setPassword(event.target.value)}
                            className="field font-mono"
                        />
                    </div>
                    <label className="flex min-h-9 items-center gap-2.5 text-[0.9333rem] text-fg-2">
                        <input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} className="size-4" />
                        Include slow tools
                    </label>
                    <button type="submit" disabled={!file || running} aria-busy={running} className="btn btn-primary mt-auto w-full">
                        {running ? `Analyzing ${finished}/${slots.length || "…"}` : "Analyze"}
                    </button>
                    {error && <p role="alert" className="error-text">{error}</p>}
                </div>
            </form>

            {info && (
                <section className="panel mt-5 overflow-hidden" aria-live="polite" aria-labelledby="results-heading">
                    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-3">
                        <h2 id="results-heading" className="font-semibold">Results</h2>
                        <span className="flex gap-4 text-sm text-fg-3">
                            <span className="font-mono text-fg-2">{info.name}</span>
                            {elapsed !== null && <span className="tabular-nums">{seconds(elapsed)}</span>}
                        </span>
                    </header>

                    {withOutput.map((slot) => <ResultSection key={slot.name} slot={slot} />)}

                    {pending.length > 0 && (
                        <p className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm text-fg-2 last:border-b-0">
                            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-signal" />
                            {running ? "Waiting on" : "Did not finish:"} {pending.map((slot) => labelOf(slot.name)).join(", ")}
                        </p>
                    )}

                    {quiet.length > 0 && (
                        <details className="group px-5 py-3">
                            <summary className="flex min-h-7 list-none items-center gap-2 text-sm text-fg-2 marker:hidden hover:text-fg">
                                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="transition-transform group-open:rotate-90">
                                    <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                No output from {quiet.map((slot) => labelOf(slot.name)).join(", ")}
                            </summary>
                            <dl className="mt-2 grid gap-x-6 gap-y-1.5 pb-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
                                {quiet.map((slot) => (
                                    <div key={slot.name} className="contents">
                                        <dt className="text-fg-2">{labelOf(slot.name)}</dt>
                                        <dd className="font-mono text-[0.8667rem] wrap-break-word whitespace-pre-wrap text-fg-3">{slot.result?.error}</dd>
                                    </div>
                                ))}
                            </dl>
                        </details>
                    )}
                </section>
            )}
        </ToolPage>
    );
}

function ResultSection({ slot }: { slot: Slot }) {
    const result = slot.result!;
    const found = Boolean(result.download);
    return (
        <section className="border-b border-line px-5 py-4" aria-labelledby={`r-${slot.name}`}>
            <header className="flex items-center gap-2.5">
                {found && <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />}
                <h3 id={`r-${slot.name}`} className="font-medium">{labelOf(slot.name)}</h3>
                {result.note && <span className={`text-sm ${found ? "text-signal" : "text-fg-2"}`}>{result.note}</span>}
                {slot.durationMs !== undefined && <span className="ml-auto text-sm text-fg-3 tabular-nums">{seconds(slot.durationMs)}</span>}
            </header>
            <div className="mt-3 flex min-w-0 flex-col gap-3">
                {result.images && <ImageGroups groups={result.images} />}
                {result.output !== undefined && <Output output={result.output} />}
                {result.download && (
                    <a href={result.download} download className="btn self-start">
                        Download extracted files
                    </a>
                )}
            </div>
        </section>
    );
}

function ImageGroups({ groups }: { groups: Record<string, string[]> }) {
    const entries = Object.entries(groups);
    const labelled = entries.length > 1; // a single group would only repeat the section name
    return (
        <div className="flex flex-col gap-4">
            {entries.map(([group, urls]) => (
                <div key={group} className={labelled ? "grid gap-2 md:grid-cols-[6rem_minmax(0,1fr)] md:items-start" : ""}>
                    {labelled && <h4 className="text-sm text-fg-2">{group}</h4>}
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                        {urls.map((url, index) => (
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title={urls.length === 8 ? `Bit ${index}` : undefined}
                                className="relative block overflow-hidden rounded-md border border-line bg-inset no-underline transition-colors duration-100 hover:border-signal"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element -- generated per analysis, not optimizable */}
                                <img
                                    src={url}
                                    alt={urls.length === 8 ? `${group} bit ${index}` : `${group} ${index + 1}`}
                                    loading="lazy"
                                    className="aspect-square w-full object-contain [image-rendering:pixelated]"
                                />
                                {urls.length === 8 && (
                                    <span className="absolute right-1 bottom-0.5 font-mono text-[0.6667rem] text-fg-2 [text-shadow:0_0_3px_var(--canvas)]">{index}</span>
                                )}
                            </a>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Output({ output }: { output: NonNullable<AnalyzerResult["output"]> }) {
    const [filter, setFilter] = useState("");
    const [copied, setCopied] = useState(false);

    if (typeof output === "object" && !Array.isArray(output)) {
        const rows = Object.entries(output);
        if (rows.length === 0) return null;
        return (
            <div className="max-h-104 overflow-auto rounded-md border border-line">
                <table className="w-full text-left text-sm">
                    <tbody>
                        {rows.map(([key, value]) => (
                            <tr key={key} className="border-b border-line align-top last:border-b-0 even:bg-inset">
                                <th scope="row" className="w-[36%] px-3 py-1.5 font-normal text-fg-2">{key}</th>
                                <td className="px-3 py-1.5 font-mono text-[0.8667rem] break-all">{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    const allLines = Array.isArray(output) ? output : output.split("\n");
    if (allLines.length === 0) return null;
    const needle = filter.toLowerCase();
    const shown = needle ? allLines.filter((line) => line.toLowerCase().includes(needle)) : allLines;

    const copyButton = (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard.writeText(shown.join("\n"));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="btn btn-quiet min-h-8 px-2.5 py-1 text-sm"
        >
            {copied ? "Copied" : "Copy"}
        </button>
    );

    if (allLines.length <= 20) {
        return (
            <div className="flex items-start gap-2 rounded-md border border-line bg-inset">
                <pre className="min-w-0 flex-1 overflow-auto p-3 font-mono text-[0.8667rem] leading-relaxed wrap-break-word whitespace-pre-wrap">{shown.join("\n")}</pre>
                <div className="shrink-0 p-1.5">{copyButton}</div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-md border border-line bg-inset focus-within:border-signal">
            <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
                <input
                    type="search"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder={`Filter ${allLines.length} lines`}
                    aria-label="Filter output"
                    className="min-h-8 flex-1 rounded bg-transparent px-2 font-mono text-[0.8667rem] text-fg outline-none placeholder:text-fg-3 focus-visible:outline-none"
                />
                {copyButton}
            </div>
            <pre className="max-h-104 overflow-auto p-3 font-mono text-[0.8667rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
                {shown.join("\n") || "No matching lines."}
            </pre>
        </div>
    );
}
