"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Solution = { plaintext: string; score: number; key: Record<string, string> };
type Mapping = { cipher: string; plain: string };

const solverUrl = process.env.NEXT_PUBLIC_SOLVER_API_URL ?? "http://localhost:8000/api/solve";

export default function CryptogramSolverPage() {
    const [ciphertext, setCiphertext] = useState("GSV JFRXP YILDM ULC");
    const [mode, setMode] = useState("hybrid");
    const [iterations, setIterations] = useState(6000);
    const [restarts, setRestarts] = useState(12);
    const [solutionCount, setSolutionCount] = useState(10);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [status, setStatus] = useState("Ready");
    const [error, setError] = useState("");

    async function copy(text: string) {
        await navigator.clipboard.writeText(text);
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
                setError("Mappings must use one letter on each side.");
                return;
            }
            constraints[cipher] = plain;
        }

        setStatus("Solving…");
        try {
            const response = await fetch(solverUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ciphertext, mode, iterations, restarts, solutions: solutionCount, constraints }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.detail || "The solver request failed.");
            setSolutions(body.solutions as Solution[]);
            setStatus(`${body.solutions.length} candidates`);
        } catch (problem) {
            setStatus("Error");
            setError(problem instanceof Error ? problem.message : "Could not reach the solver API.");
        }
    }

    return (
        <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
            <header className="flex flex-col items-center gap-6 text-center">
                <h1 className="mt-5 text-3xl text-amber-300">
                    <span className="animate-fadeIn">Cryptogram Solver</span>
                </h1>
                <p className="text-amber-300">Offline monoalphabetic substitution cryptogram solver.</p>
            </header>

            <form onSubmit={solve} className="flex w-full flex-col items-center gap-6">
                <label htmlFor="ciphertext" className="w-full max-w-4xl text-amber-300">Ciphertext</label>
                <textarea id="ciphertext" value={ciphertext} onChange={(event) => setCiphertext(event.target.value)} rows={6}
                    placeholder="Paste a substitution cipher…" required
                    className="w-full max-w-4xl resize-y border-2 border-amber-300 bg-transparent p-5 font-mono text-amber-300 outline-none placeholder:text-stone-400" />

                <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
                    <label className="text-amber-300">Mode
                        <select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 w-full border-2 border-amber-300 bg-stone-800 p-2 text-amber-300">
                            <option value="hybrid">Hybrid</option><option value="statistics">Statistics</option><option value="dictionary">Dictionary</option>
                        </select>
                    </label>
                    <label className="text-amber-300">Iterations
                        <input type="number" min={1} max={50000} value={iterations} onChange={(event) => setIterations(Number(event.target.value))} className="mt-2 w-full border-2 border-amber-300 bg-stone-800 p-2 text-amber-300" />
                    </label>
                    <label className="text-amber-300">Restarts
                        <input type="number" min={1} max={100} value={restarts} onChange={(event) => setRestarts(Number(event.target.value))} className="mt-2 w-full border-2 border-amber-300 bg-stone-800 p-2 text-amber-300" />
                    </label>
                    <label className="text-amber-300">Results
                        <input type="number" min={1} max={25} value={solutionCount} onChange={(event) => setSolutionCount(Number(event.target.value))} className="mt-2 w-full border-2 border-amber-300 bg-stone-800 p-2 text-amber-300" />
                    </label>
                </div>

                <div className="mt-2 flex w-full max-w-4xl items-center justify-between gap-3">
                    <h2 className="text-sm font-medium text-amber-300">Known mappings</h2>
                    <button type="button" onClick={() => setMappings([...mappings, { cipher: "", plain: "" }])}
                        className="cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800">+ Add mapping</button>
                </div>
                <div className="flex w-full max-w-4xl flex-wrap gap-2">
                    {mappings.map((mapping, index) => <div key={index} className="flex items-center gap-2">
                        <input aria-label="Cipher letter" maxLength={1} placeholder="G" value={mapping.cipher} onChange={(event) => setMappings(mappings.map((item, i) => i === index ? { ...item, cipher: event.target.value } : item))}
                            className="w-12 border-2 border-amber-300 bg-transparent p-2 text-center uppercase text-amber-300" />
                        <span className="text-amber-400">→</span>
                        <input aria-label="Plaintext letter" maxLength={1} placeholder="T" value={mapping.plain} onChange={(event) => setMappings(mappings.map((item, i) => i === index ? { ...item, plain: event.target.value } : item))}
                            className="w-12 border-2 border-amber-300 bg-transparent p-2 text-center uppercase text-amber-300" />
                        <button type="button" aria-label="Remove mapping" onClick={() => setMappings(mappings.filter((_, i) => i !== index))} className="cursor-pointer px-2 text-amber-300 hover:text-amber-500">×</button>
                    </div>)}
                </div>

                {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={status === "Solving…"} className="cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800 disabled:cursor-wait disabled:opacity-60">
                    {status === "Solving…" ? "SOLVING…" : "SOLVE →"}
                </button>
            </form>

            <section className="mt-4 flex w-full flex-col items-center gap-4">
                <div className="flex w-full max-w-5xl items-center justify-between text-amber-300"><h2 className="text-xl">Candidate solutions</h2><span>{status}</span></div>
                {solutions.length === 0 ? <p className="text-amber-300">Results will appear here.</p> : <div className="grid w-full max-w-5xl gap-4">
                    {[...solutions].sort((a, b) => b.score - a.score).map((solution, index) => {
                        const key = Object.entries(solution.key).map(([cipher, plain]) => `${cipher}→${plain}`).join("  ");
                        return <article key={`${solution.plaintext}-${index}`} className="w-full border-2 border-amber-300 p-4 text-amber-300">
                            <div className="flex items-center justify-between"><strong>#{index + 1}</strong><span>score {solution.score.toFixed(3)}</span></div>
                            <pre className="my-4 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{solution.plaintext}</pre>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => void copy(solution.plaintext)} className="cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800">Copy plaintext</button>
                                <button type="button" onClick={() => void copy(key)} className="cursor-pointer rounded-md border-2 border-amber-300 p-2 text-amber-300 transition hover:bg-amber-300 hover:text-stone-800">Copy key</button>
                            </div>
                        </article>;
                    })}
                </div>}
            </section>
        </main>
    );
}
