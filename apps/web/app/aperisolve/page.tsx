"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import FileDrop from "@/components/file-drop";
import {
    ANALYZER_INFO,
    MAX_UPLOAD_BYTES,
    analyze,
    formatBytes,
    type AnalyzerResult,
    type FileInfo,
} from "@/lib/tools/aperisolve/client";

type Slot = { name: string; order: number; result?: AnalyzerResult; durationMs?: number };

const button =
    "cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800 disabled:cursor-wait disabled:opacity-60";

export default function AperiSolvePage() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [deep, setDeep] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState<FileInfo | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [elapsed, setElapsed] = useState<number | null>(null);
    const controller = useRef<AbortController | null>(null);

    const preview = useMemo(() => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
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
        <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
            <header className="flex flex-col items-center gap-6 text-center">
                <h1 className="mt-5 text-3xl text-amber-300">AperiSolve</h1>
                <p className="text-amber-300">
                    Image steganography analysis: bit planes, metadata, embedded files and stego tools, all at once.
                </p>
            </header>

            <form onSubmit={run} className="mt-8 flex w-full flex-col items-center gap-6">
                <FileDrop
                    file={file}
                    onFile={(chosen) => {
                        setFile(chosen);
                        setSlots([]);
                        setInfo(null);
                        setError("");
                    }}
                    maxBytes={MAX_UPLOAD_BYTES}
                    disabled={running}
                    hint={`PNG, JPEG, BMP, GIF, WAV, or any file up to ${formatBytes(MAX_UPLOAD_BYTES)}`}
                />
                {preview && (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                    <img src={preview} alt="Uploaded file preview" className="max-h-64 max-w-full border-2 border-amber-300 object-contain" />
                )}

                <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
                    <label className="text-amber-300">
                        Password <span className="text-sm text-stone-300">(optional, for steghide and OutGuess)</span>
                        <input
                            type="text"
                            value={password}
                            maxLength={256}
                            autoComplete="off"
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 w-full border-2 border-amber-300 bg-stone-800 p-2 font-mono text-amber-300"
                        />
                    </label>
                    <label className="flex items-center gap-3 text-amber-300 md:mt-8">
                        <input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} className="size-4 accent-amber-300" />
                        Deep analysis <span className="text-sm text-stone-300">(adds slower tools like OutGuess)</span>
                    </label>
                </div>

                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={!file || running} className={button}>
                    {running ? `ANALYZING… ${finished}/${slots.length || "?"}` : "ANALYZE →"}
                </button>
            </form>

            {info && (
                <section className="mt-10 flex flex-col gap-4" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-amber-300">
                        <h2 className="text-xl">Results</h2>
                        <span className="font-mono text-sm text-stone-300">
                            {info.name} · {info.mime} · {formatBytes(info.size)}
                            {elapsed !== null && ` · ${(elapsed / 1000).toFixed(1)}s`}
                        </span>
                    </div>
                    {slots.map((slot) => <ResultCard key={slot.name} slot={slot} />)}
                </section>
            )}
        </main>
    );
}

function ResultCard({ slot }: { slot: Slot }) {
    const { label, description } = ANALYZER_INFO[slot.name] ?? { label: slot.name, description: "" };
    const result = slot.result;
    const status = !result ? "running…" : result.status === "ok" ? "done" : result.status === "unavailable" ? "not installed" : "nothing found";
    const tone = !result ? "text-stone-300" : result.status === "ok" ? "text-amber-300" : "text-stone-400";

    return (
        <article className="w-full border-2 border-amber-300 p-4 text-amber-300">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-lg">{label}</h3>
                    <p className="text-sm text-stone-300">{description}</p>
                </div>
                <span className={`font-mono text-sm ${tone}`}>
                    {status}
                    {slot.durationMs !== undefined && ` · ${(slot.durationMs / 1000).toFixed(1)}s`}
                </span>
            </header>
            {result && (
                <div className="mt-4 flex flex-col gap-4">
                    {result.note && <p className="text-sm text-amber-200">{result.note}</p>}
                    {result.error && result.status !== "ok" && (
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm text-stone-400">{result.error}</pre>
                    )}
                    {result.images && <ImageGroups groups={result.images} />}
                    {result.output !== undefined && <Output output={result.output} />}
                    {result.download && (
                        <a href={result.download} download className={`${button} self-start`}>
                            Download extracted files
                        </a>
                    )}
                </div>
            )}
        </article>
    );
}

function ImageGroups({ groups }: { groups: Record<string, string[]> }) {
    return (
        <div className="flex flex-col gap-4">
            {Object.entries(groups).map(([group, urls]) => (
                <div key={group}>
                    <h4 className="mb-2 text-sm text-stone-300">{group}</h4>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                        {urls.map((url, index) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="group block">
                                {/* eslint-disable-next-line @next/next/no-img-element -- generated per analysis, not optimizable */}
                                <img
                                    src={url}
                                    alt={urls.length === 8 ? `${group} bit ${index}` : `${group} ${index + 1}`}
                                    loading="lazy"
                                    className="aspect-square w-full border border-amber-300/40 bg-stone-900 object-contain [image-rendering:pixelated] group-hover:border-amber-300"
                                />
                                {urls.length === 8 && <span className="text-xs text-stone-400">bit {index}</span>}
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
            <div className="max-h-96 overflow-auto">
                <table className="w-full text-left font-mono text-sm">
                    <tbody>
                        {rows.map(([key, value]) => (
                            <tr key={key} className="border-b border-amber-300/20 align-top">
                                <th className="py-1 pr-4 font-normal text-stone-300">{key}</th>
                                <td className="break-all py-1">{value}</td>
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
            <div className="flex flex-wrap items-center gap-2">
                {allLines.length > 20 && (
                    <input
                        type="search"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder={`Filter ${allLines.length} lines (try "flag" or "{")`}
                        aria-label="Filter output"
                        className="flex-1 border-2 border-amber-300 bg-stone-800 p-1 px-2 font-mono text-sm text-amber-300 placeholder:text-stone-500"
                    />
                )}
                <button
                    type="button"
                    onClick={() => {
                        void navigator.clipboard.writeText(shown.join("\n"));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    }}
                    className="cursor-pointer text-sm text-stone-300 hover:text-amber-300"
                >
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                {shown.join("\n") || "No matching lines."}
            </pre>
        </div>
    );
}
