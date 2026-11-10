"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import FileDrop from "@/components/file-drop";
import PageHeader, { ToolPage } from "@/components/page-header";
import { formatBytes } from "@/lib/format";
import {
    ANALYZER_INFO,
    DEFAULT_MAX_UPLOAD_BYTES,
    analyze,
    fetchUploadLimit,
    type AnalyzerResult,
    type FileInfo,
} from "@/lib/tools/aperisolve/client";

type Slot = { name: string; order: number; result?: AnalyzerResult; durationMs?: number };

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

    const preview = useMemo(() => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
    const [previewFailed, setPreviewFailed] = useState<string | null>(null);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
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

    const finished = slots.filter((slot) => slot.result).length;

    return (
        <ToolPage>
            <PageHeader slug="aperisolve" lede="Upload an image or audio file. Bit planes, metadata, embedded files and the usual stego tools all run at once." />

            <form onSubmit={run} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex flex-col gap-4">
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
                        hint={`PNG, JPEG, BMP, GIF, WAV, or any other file up to ${formatBytes(maxBytes)}`}
                    />
                    {preview && previewFailed !== preview && (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                        <img
                            src={preview}
                            alt="Preview of the chosen file"
                            onError={() => setPreviewFailed(preview)}
                            className="max-h-72 max-w-full self-start border-2 border-ink bg-sheet object-contain"
                        />
                    )}
                </div>

                <div className="flex flex-col gap-5">
                    <div>
                        <label htmlFor="stego-password" className="field-label">
                            Password <span className="field-hint">(optional)</span>
                        </label>
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
                        <p className="mt-1.5 text-sm text-ink-2">Used by steghide and OutGuess.</p>
                    </div>
                    <label className="flex items-start gap-3">
                        <input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} className="mt-1 size-4 accent-ink" />
                        <span>
                            <span className="font-semibold">Deep analysis</span>
                            <span className="block text-sm text-ink-2">Adds slower tools like OutGuess.</span>
                        </span>
                    </label>
                    {error && <p role="alert" className="alert text-sm">{error}</p>}
                    <button type="submit" disabled={!file || running} className="btn btn-primary w-full">
                        {running ? `Analyzing: ${finished} of ${slots.length || "?"} done` : "Analyze file"}
                    </button>
                </div>
            </form>

            {info && (
                <section className="mt-14" aria-live="polite" aria-labelledby="results-heading">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-[3px] border-ink pb-3">
                        <h2 id="results-heading" className="text-2xl font-extrabold">Results</h2>
                        <p className="text-sm text-ink-2">
                            <span className="font-mono text-ink">{info.name}</span>, {info.mime}, {formatBytes(info.size)}
                            {elapsed !== null && `, finished in ${(elapsed / 1000).toFixed(1)}s`}
                        </p>
                    </div>
                    <ol>
                        {slots.map((slot) => <ResultRow key={slot.name} slot={slot} running={running} />)}
                    </ol>
                </section>
            )}
        </ToolPage>
    );
}

function statusOf(result: AnalyzerResult | undefined, running: boolean) {
    if (!result) return running ? { label: "Running", mark: "pending" } : { label: "Did not finish", mark: "empty" };
    if (result.status === "unavailable") return { label: "Not installed", mark: "empty" };
    if (result.status !== "ok") return { label: "Nothing found", mark: "empty" };
    if (result.download) return { label: "Extracted files", mark: "found" };
    return { label: "Done", mark: "done" };
}

function ResultRow({ slot, running }: { slot: Slot; running: boolean }) {
    const { label, description } = ANALYZER_INFO[slot.name] ?? { label: slot.name, description: "" };
    const result = slot.result;
    const status = statusOf(result, running);
    const markClass = {
        found: "bg-red border-red",
        done: "bg-ink border-ink",
        empty: "bg-transparent border-ink-2",
        pending: "bg-transparent border-ink-2 animate-pulse",
    }[status.mark];

    return (
        <li className="grid gap-x-8 gap-y-3 border-b border-ink py-6 md:grid-cols-[13rem_minmax(0,1fr)]">
            <div>
                <h3 className="text-lg font-bold leading-tight">{label}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className={`size-2.5 shrink-0 border-2 ${markClass}`} />
                    <span className={status.mark === "found" ? "font-semibold text-red-ink" : "text-ink-2"}>{status.label}</span>
                    {slot.durationMs !== undefined && <span className="text-ink-2">in {(slot.durationMs / 1000).toFixed(1)}s</span>}
                </p>
                <p className="mt-2 text-sm text-ink-2">{description}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
                {!result && <p className="text-sm text-ink-2">{running ? "Waiting for this tool." : "No result came back."}</p>}
                {result?.note && <p className="font-semibold">{result.note}</p>}
                {result?.error && result.status !== "ok" && (
                    <pre className="font-mono text-sm whitespace-pre-wrap break-words text-ink-2">{result.error}</pre>
                )}
                {result?.images && <ImageGroups groups={result.images} />}
                {result?.output !== undefined && <Output output={result.output} />}
                {result?.download && (
                    <a href={result.download} download className="btn btn-secondary self-start">
                        Download extracted files
                    </a>
                )}
            </div>
        </li>
    );
}

function ImageGroups({ groups }: { groups: Record<string, string[]> }) {
    return (
        <div className="flex flex-col gap-5">
            {Object.entries(groups).map(([group, urls]) => (
                <div key={group}>
                    <h4 className="mb-2 text-sm font-semibold">{group}</h4>
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                        {urls.map((url, index) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="group block no-underline">
                                {/* eslint-disable-next-line @next/next/no-img-element -- generated per analysis, not optimizable */}
                                <img
                                    src={url}
                                    alt={urls.length === 8 ? `${group} bit ${index}` : `${group} ${index + 1}`}
                                    loading="lazy"
                                    className="aspect-square w-full border border-ink bg-well object-contain [image-rendering:pixelated] group-hover:outline-2 group-hover:outline-red"
                                />
                                {urls.length === 8 && <span className="text-xs text-ink-2">Bit {index}</span>}
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
            <div className="max-h-[28rem] overflow-auto border-t border-ink">
                <table className="w-full text-left text-sm">
                    <tbody>
                        {rows.map(([key, value]) => (
                            <tr key={key} className="border-b border-hair align-top">
                                <th scope="row" className="w-[38%] py-1.5 pr-4 font-semibold">{key}</th>
                                <td className="py-1.5 font-mono break-all">{value}</td>
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

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
                {allLines.length > 20 && (
                    <input
                        type="search"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder={`Filter ${allLines.length} lines, e.g. flag or {`}
                        aria-label="Filter output"
                        className="field min-h-10 flex-1 font-mono text-sm"
                    />
                )}
                <button
                    type="button"
                    onClick={() => {
                        void navigator.clipboard.writeText(shown.join("\n"));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    }}
                    className="min-h-10 text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-red-ink"
                >
                    {copied ? "Copied" : "Copy output"}
                </button>
            </div>
            <pre className="max-h-[28rem] overflow-auto bg-well p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap break-words">
                {shown.join("\n") || "No matching lines."}
            </pre>
        </div>
    );
}
