"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import CodeEditor from "@/components/code-editor";
import PageHeader, { ToolPage } from "@/components/page-header";

const starterRule = `title: Suspicious PowerShell Download\nstatus: test\nlogsource:\n  product: windows\n  category: process_creation\ndetection:\n  selection:\n    Image|endswith: \\powershell.exe\n    CommandLine|contains: DownloadString\n  condition: selection\n`;

type Result = { target: string; query: string; title?: string | null; rule_count: number };

export default function SigmaShiftPage() {
    const [rule, setRule] = useState(starterRule);
    const [target, setTarget] = useState("splunk");
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    async function convert(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setResult(null);
        try {
            const response = await fetch("/api/sigma/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rule, target }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.detail ?? "Conversion failed.");
            setResult(body as Result);
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : "Conversion failed.");
        } finally {
            setBusy(false);
        }
    }

    async function loadFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 64 * 1024) {
            setError("Choose a Sigma file smaller than 64 KB.");
            event.target.value = "";
            return;
        }
        setRule(await file.text());
        setResult(null);
        setError("");
        event.target.value = "";
    }

    return (
        <ToolPage>
            <PageHeader slug="sigma-shift" />
            <form onSubmit={convert} className="panel mt-5 grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="flex min-w-0 flex-col">
                    <div className="mb-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
                        <label htmlFor="sigma-rule" className="field-label mb-0">Sigma rule</label>
                        <span className="text-xs text-fg-3">YAML · max 64 KB</span>
                    </div>
                    <div className="code-editor-frame min-w-0 overflow-hidden rounded-lg border-2 border-signal">
                        <CodeEditor value={rule} onChange={(value) => { setRule(value); setResult(null); }} language="sigma" label="Sigma rule YAML" minHeight="20rem" />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="sigma-target" className="field-label">Query target</label>
                        <select id="sigma-target" value={target} onChange={(event) => { setTarget(event.target.value); setResult(null); }} className="field">
                            <option value="splunk">Splunk SPL</option>
                            <option value="elasticsearch">Elasticsearch Lucene</option>
                        </select>
                    </div>
                    <input ref={fileInput} type="file" accept=".yml,.yaml,text/yaml,text/plain" onChange={loadFile} className="sr-only" />
                    <button type="button" onClick={() => fileInput.current?.click()} className="btn w-full">Open YAML rule</button>
                    <button type="button" onClick={() => { setRule(""); setResult(null); setError(""); }} className="btn w-full">Clear rule</button>
                    <button type="submit" disabled={!rule.trim() || busy} aria-busy={busy} className="btn btn-primary mt-auto w-full">{busy ? "Converting…" : "Convert rule"}</button>
                    {error && <p role="alert" className="error-text">{error}</p>}
                </div>
            </form>

            {result && (
                <section className="panel mt-5 p-5" aria-live="polite" aria-labelledby="sigma-result-heading">
                    <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 id="sigma-result-heading" className="font-medium">{result.title || "Converted query"}</h2>
                            <p className="text-xs text-fg-3">{result.target} · {result.rule_count} rule{result.rule_count === 1 ? "" : "s"}</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { void navigator.clipboard.writeText(result.query).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="btn min-h-9 px-3 text-sm">{copied ? "Copied" : "Copy query"}</button>
                            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(result.query)}`} download="sigma-query.txt" className="btn min-h-9 px-3 text-sm">Download</a>
                        </div>
                    </header>
                    <div className="code-editor-frame min-w-0 overflow-hidden rounded-lg border-2 border-signal">
                        <CodeEditor value={result.query} language={result.target === "Splunk SPL" ? "splunk" : "elastic-lucene"} label={`Converted ${result.target} query`} minHeight="12rem" readOnly />
                    </div>
                </section>
            )}
        </ToolPage>
    );
}
