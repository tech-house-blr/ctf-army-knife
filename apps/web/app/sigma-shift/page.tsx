"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";

const starterRule = `title: Suspicious PowerShell Download\nstatus: test\nlogsource:\n  product: windows\n  category: process_creation\ndetection:\n  selection:\n    Image|endswith: \\powershell.exe\n    CommandLine|contains: DownloadString\n  condition: selection\n`;

type Result = { target: string; query: string; title?: string | null; rule_count: number };

export default function SigmaConverterPage() {
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
                        <form onSubmit={convert} className="mt-5">
                <section className="panel overflow-hidden">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                        <div>
                            <h2 className="font-medium">Detection rule</h2>
                            <p className="text-xs text-fg-3">Sigma YAML · maximum 64 KB</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input ref={fileInput} type="file" accept=".yml,.yaml,text/yaml,text/plain" onChange={loadFile} className="sr-only" />
                            <button type="button" onClick={() => fileInput.current?.click()} className="btn min-h-9 px-3 text-sm">Open YAML</button>
                            <button type="button" onClick={() => { setRule(""); setResult(null); setError(""); }} className="btn btn-quiet min-h-9 px-3 text-sm">Clear</button>
                        </div>
                    </header>
                    <label htmlFor="sigma-rule" className="sr-only">Sigma rule YAML</label>
                    <textarea id="sigma-rule" value={rule} onChange={(event) => { setRule(event.target.value); setResult(null); }} spellCheck={false} autoCapitalize="off" autoCorrect="off" className="field min-h-80 w-full resize-y rounded-none border-0 bg-inset px-4 py-4 font-mono text-sm leading-relaxed focus-visible:outline-offset-[-2px] sm:px-5" placeholder="Paste a Sigma rule here…" />
                    <footer className="flex flex-col gap-4 border-t border-line px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                        <div className="w-full sm:max-w-xs">
                            <label htmlFor="sigma-target" className="field-label">Query target</label>
                            <select id="sigma-target" value={target} onChange={(event) => { setTarget(event.target.value); setResult(null); }} className="field">
                                <option value="splunk">Splunk SPL</option>
                                <option value="elasticsearch">Elasticsearch Lucene</option>
                            </select>
                        </div>
                        <button type="submit" disabled={!rule.trim() || busy} aria-busy={busy} className="btn btn-primary w-full sm:w-auto">{busy ? "Converting…" : "Convert rule"}</button>
                    </footer>
                </section>
            </form>

            {error && <p role="alert" className="error-text mt-4 rounded-md border border-line px-4 py-3">{error}</p>}

            {result && (
                <section className="panel mt-5 overflow-hidden" aria-live="polite" aria-labelledby="sigma-result-heading">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                        <div>
                            <h2 id="sigma-result-heading" className="font-medium">{result.title || "Converted query"}</h2>
                            <p className="text-xs text-fg-3">{result.target} · {result.rule_count} rule{result.rule_count === 1 ? "" : "s"}</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { void navigator.clipboard.writeText(result.query).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="btn min-h-9 px-3 text-sm">{copied ? "Copied" : "Copy query"}</button>
                            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(result.query)}`} download="sigma-query.txt" className="btn min-h-9 px-3 text-sm">Download</a>
                        </div>
                    </header>
                    <pre className="max-h-120 overflow-auto bg-inset p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word sm:p-5">{result.query}</pre>
                </section>
            )}
        </ToolPage>
    );
}
