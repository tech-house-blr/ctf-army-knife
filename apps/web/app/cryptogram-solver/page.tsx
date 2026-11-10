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

    async function copy(text: string, what: string) {
        await navigator.clipboard.writeText(text);
        setCopied(what);
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
                setError("Each known mapping needs one letter on each side.");
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

            <form onSubmit={solve} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                    <label htmlFor="ciphertext" className="field-label">Ciphertext</label>
                    <textarea
                        id="ciphertext"
                        value={ciphertext}
                        onChange={(event) => setCiphertext(event.target.value)}
                        rows={9}
                        spellCheck={false}
                        placeholder="Paste a substitution cipher"
                        required
                        className="field text-lg uppercase"
                    />
                </div>

                <div className="flex flex-col gap-5">
                    <div>
                        <label htmlFor="mode" className="field-label">Mode</label>
                        <select id="mode" value={mode} onChange={(event) => setMode(event.target.value)} className="field">
                            <option value="hybrid">Hybrid</option>
                            <option value="statistics">Statistics</option>
                            <option value="dictionary">Dictionary</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
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
                                    className="field font-mono"
                                />
                            </div>
                        ))}
                    </div>

                    <fieldset>
                        <legend className="field-label">
                            Known mappings <span className="field-hint">(optional)</span>
                        </legend>
                        {mappings.length > 0 && (
                            <ul className="mb-3 flex flex-col gap-2">
                                {mappings.map((mapping, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <input
                                            aria-label={`Cipher letter ${index + 1}`}
                                            maxLength={1}
                                            placeholder="G"
                                            value={mapping.cipher}
                                            onChange={(event) => updateMapping(index, "cipher", event.target.value)}
                                            className="field w-12 px-0 text-center font-mono uppercase"
                                        />
                                        <span className="text-sm text-ink-2">is</span>
                                        <input
                                            aria-label={`Plaintext letter ${index + 1}`}
                                            maxLength={1}
                                            placeholder="T"
                                            value={mapping.plain}
                                            onChange={(event) => updateMapping(index, "plain", event.target.value)}
                                            className="field w-12 px-0 text-center font-mono uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMappings(mappings.filter((_, i) => i !== index))}
                                            className="ml-auto min-h-11 px-2 text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-red-ink"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <button
                            type="button"
                            onClick={() => setMappings([...mappings, { cipher: "", plain: "" }])}
                            className="btn btn-secondary w-full"
                        >
                            Add a known letter
                        </button>
                    </fieldset>

                    {error && <p role="alert" className="alert text-sm">{error}</p>}
                    <button type="submit" disabled={solving} className="btn btn-primary w-full">
                        {solving ? "Solving…" : "Solve cipher"}
                    </button>
                </div>
            </form>

            <section className="mt-14" aria-labelledby="candidates-heading" aria-live="polite">
                <div className="flex items-baseline justify-between gap-6 border-b-[3px] border-ink pb-3">
                    <h2 id="candidates-heading" className="text-2xl font-extrabold">Candidates</h2>
                    <p className="text-sm text-ink-2">
                        {solving ? "Solving…" : solutions.length ? `${solutions.length} found, best first` : ""}
                        {copied && <span className="ml-3 font-semibold text-ink">{copied} copied</span>}
                    </p>
                </div>
                {solutions.length === 0 ? (
                    <p className="py-6 text-ink-2">Solve a cipher to see the most likely plaintexts here.</p>
                ) : (
                    <ol>
                        {solutions.map((solution, index) => {
                            const key = Object.entries(solution.key)
                                .map(([cipher, plain]) => `${cipher}=${plain}`)
                                .join(" ");
                            return (
                                <li
                                    key={`${solution.plaintext}-${index}`}
                                    className="grid gap-x-8 gap-y-3 border-b border-ink py-5 md:grid-cols-[6rem_minmax(0,1fr)_auto]"
                                >
                                    <div className="flex items-baseline gap-3 md:flex-col md:gap-1">
                                        <span className="text-2xl font-extrabold leading-none">{index + 1}</span>
                                        {index === 0 && <span className="text-sm font-semibold text-red-ink">Best match</span>}
                                        <span className="font-mono text-sm text-ink-2">{solution.score.toFixed(3)}</span>
                                    </div>
                                    <pre className="font-mono text-base leading-relaxed whitespace-pre-wrap break-words">{solution.plaintext}</pre>
                                    <div className="flex gap-5 md:justify-end">
                                        <button type="button" onClick={() => void copy(solution.plaintext, "Plaintext")} className="min-h-10 text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-red-ink">
                                            Copy plaintext
                                        </button>
                                        <button type="button" onClick={() => void copy(key, "Key")} className="min-h-10 text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-red-ink">
                                            Copy key
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>
        </ToolPage>
    );
}
