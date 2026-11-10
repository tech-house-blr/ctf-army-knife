"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import PageHeader, { ToolPage } from "@/components/page-header";

type Solution = {
    plaintext: string;
    score: number;
    key: Record<string, string>;
};
type Mapping = { cipher: string; plain: string };

// Same-origin; app/api/[...path]/route.ts proxies this to the Python API.
const solverUrl = "/api/solve";

const settingFields = [
    { id: "iterations", label: "Iterations", min: 1, max: 50000 },
    { id: "restarts", label: "Restarts", min: 1, max: 100 },
    { id: "results", label: "Results", min: 1, max: 25 },
] as const;

export default function CryptogramSolverPage() {
    const [ciphertext, setCiphertext] = useState("GSV JFRXP YILDM ULC");
    const [mode, setMode] = useState("hybrid");
    const [settings, setSettings] = useState({ iterations: 6000, restarts: 12, results: 10 });
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [solving, setSolving] = useState(false);
    const [copied, setCopied] = useState("");
    const [error, setError] = useState("");

    async function copy(text: string, id: string) {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(""), 1500);
    }

    function updateMapping(index: number, side: keyof Mapping, value: string) {
        setMappings(mappings.map((item, i) => (i === index ? { ...item, [side]: value } : item)));
    }

    async function solve(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        const constraints: Record<string, string> = {};
        for (const mapping of mappings) {
            const cipher = mapping.cipher.trim().toUpperCase();
            const plain = mapping.plain.trim().toUpperCase();
            if (!cipher && !plain) continue;
            if (!/^[A-Z]$/.test(cipher) || !/^[A-Z]$/.test(plain)) {
                setError("Each known letter needs one letter on each side.");
                return;
            }
            constraints[cipher] = plain;
        }

        setSolving(true);
        try {
            const response = await fetch(solverUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ciphertext,
                    mode,
                    iterations: settings.iterations,
                    restarts: settings.restarts,
                    solutions: settings.results,
                    constraints,
                }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.detail || "The solver request failed.");
            setSolutions([...(body.solutions as Solution[])].sort((a, b) => b.score - a.score));
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : "Could not reach the solver API.");
        } finally {
            setSolving(false);
        }
    }

    return (
        <ToolPage>
            <PageHeader slug="cryptogram-solver" />

            <form onSubmit={solve} className="panel mt-5 grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="flex flex-col">
                    <label htmlFor="ciphertext" className="field-label">Ciphertext</label>
                    <textarea
                        id="ciphertext"
                        value={ciphertext}
                        onChange={(event) => setCiphertext(event.target.value)}
                        rows={8}
                        spellCheck={false}
                        required
                        className="field flex-1 text-base uppercase"
                    />
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="mode" className="field-label">Mode</label>
                        <select id="mode" value={mode} onChange={(event) => setMode(event.target.value)} className="field">
                            <option value="hybrid">Hybrid</option>
                            <option value="statistics">Statistics</option>
                            <option value="dictionary">Dictionary</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {settingFields.map((field) => (
                            <div key={field.id}>
                                <label htmlFor={field.id} className="field-label">{field.label}</label>
                                <input
                                    id={field.id}
                                    type="number"
                                    min={field.min}
                                    max={field.max}
                                    value={settings[field.id]}
                                    onChange={(event) => setSettings({ ...settings, [field.id]: Number(event.target.value) })}
                                    className="field px-2 font-mono tabular-nums"
                                />
                            </div>
                        ))}
                    </div>

                    <fieldset>
                        <legend className="field-label">Known letters</legend>
                        {mappings.length > 0 && (
                            <ul className="mb-2 flex flex-col gap-1.5">
                                {mappings.map((mapping, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <input
                                            aria-label={`Cipher letter ${index + 1}`}
                                            maxLength={1}
                                            value={mapping.cipher}
                                            onChange={(event) => updateMapping(index, "cipher", event.target.value)}
                                            className="field w-11 px-0 text-center font-mono uppercase"
                                        />
                                        <span aria-hidden="true" className="text-fg-3">=</span>
                                        <input
                                            aria-label={`Plaintext letter ${index + 1}`}
                                            maxLength={1}
                                            value={mapping.plain}
                                            onChange={(event) => updateMapping(index, "plain", event.target.value)}
                                            className="field w-11 px-0 text-center font-mono uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMappings(mappings.filter((_, i) => i !== index))}
                                            aria-label={`Remove known letter ${index + 1}`}
                                            className="btn btn-quiet ml-auto size-9 min-h-9 p-0"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.5" /></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <button type="button" onClick={() => setMappings([...mappings, { cipher: "", plain: "" }])} className="btn w-full">
                            Add letter
                        </button>
                    </fieldset>

                    <button type="submit" disabled={solving} aria-busy={solving} className="btn btn-primary mt-auto w-full">
                        {solving ? "Solving…" : "Solve"}
                    </button>
                    {error && <p role="alert" className="error-text">{error}</p>}
                </div>
            </form>

            {solutions.length > 0 && (
                <section className="panel mt-5 overflow-hidden" aria-labelledby="candidates-heading" aria-live="polite">
                    <header className="flex items-center justify-between gap-6 border-b border-line px-5 py-3">
                        <h2 id="candidates-heading" className="font-semibold">Candidates</h2>
                        <span className="text-sm text-fg-3 tabular-nums">{solutions.length}</span>
                    </header>
                    <ol>
                        {solutions.map((solution, index) => {
                            const key = Object.entries(solution.key)
                                .map(([cipher, plain]) => `${cipher}=${plain}`)
                                .join(" ");
                            const best = index === 0;
                            return (
                                <li
                                    key={`${solution.plaintext}-${index}`}
                                    aria-label={best ? `Candidate 1, highest score` : `Candidate ${index + 1}`}
                                    className={`grid items-baseline gap-x-5 gap-y-1 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_auto] ${best ? "bg-signal-soft" : ""}`}
                                >
                                    <span className={`text-sm tabular-nums ${best ? "font-semibold text-signal" : "text-fg-3"}`}>{index + 1}</span>
                                    <pre className={`font-mono text-[0.9333rem] leading-relaxed wrap-break-word whitespace-pre-wrap ${best ? "text-fg" : "text-fg-2"}`}>{solution.plaintext}</pre>
                                    <span className="text-sm text-fg-3 tabular-nums sm:text-right">{solution.score.toFixed(2)}</span>
                                    <span className="flex gap-1 sm:justify-end">
                                        <button type="button" onClick={() => void copy(solution.plaintext, `p${index}`)} className="btn btn-quiet min-h-8 px-2.5 py-1 text-sm">
                                            {copied === `p${index}` ? "Copied" : "Copy text"}
                                        </button>
                                        <button type="button" onClick={() => void copy(key, `k${index}`)} className="btn btn-quiet min-h-8 px-2.5 py-1 text-sm">
                                            {copied === `k${index}` ? "Copied" : "Copy key"}
                                        </button>
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}
        </ToolPage>
    );
}
