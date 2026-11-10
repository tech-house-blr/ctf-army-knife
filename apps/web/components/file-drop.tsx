"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { formatBytes } from "@/lib/format";

type FileDropProps = {
    file: File | null;
    onFile: (file: File) => void;
    accept?: string;
    maxBytes?: number;
    disabled?: boolean;
    hint?: string;
};

/** Reusable file picker: click, drag and drop, or paste (Ctrl+V) an image. */
export default function FileDrop({ file, onFile, accept, maxBytes, disabled, hint }: FileDropProps) {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");

    function choose(candidate: File | undefined) {
        if (!candidate || disabled) return;
        if (maxBytes && candidate.size > maxBytes) {
            setError(`${candidate.name} is ${formatBytes(candidate.size)}; the limit is ${formatBytes(maxBytes)}.`);
            return;
        }
        setError("");
        onFile(candidate);
    }

    // Paste anywhere on the page, e.g. a screenshot.
    useEffect(() => {
        function onPaste(event: globalThis.ClipboardEvent) {
            const pasted = event.clipboardData?.files?.[0];
            if (pasted) choose(pasted);
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    });

    function onDrop(event: DragEvent<HTMLButtonElement>) {
        event.preventDefault();
        setDragging(false);
        choose(event.dataTransfer.files[0]);
    }

    return (
        <div className="w-full">
            <button
                type="button"
                disabled={disabled}
                onClick={() => input.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex min-h-40 w-full flex-col items-start justify-center gap-1 border-2 border-dashed px-6 py-8 text-left transition-colors duration-100 disabled:cursor-wait disabled:opacity-60 ${
                    dragging ? "border-red bg-sheet" : "border-ink bg-sheet/60 hover:bg-sheet"
                }`}
            >
                {file ? (
                    <>
                        <span className="font-mono text-lg font-medium break-all">{file.name}</span>
                        <span className="text-sm text-ink-2">{formatBytes(file.size)}. Click or drop another file to replace it.</span>
                    </>
                ) : (
                    <>
                        <span className="text-xl font-bold">Drop a file here, click to choose, or paste</span>
                        {hint && <span className="text-sm text-ink-2">{hint}</span>}
                    </>
                )}
            </button>
            <input
                ref={input}
                type="file"
                accept={accept}
                hidden
                onChange={(event) => {
                    choose(event.target.files?.[0]);
                    event.target.value = "";
                }}
            />
            {error && (
                <p role="alert" className="alert mt-3 text-sm">
                    {error}
                </p>
            )}
        </div>
    );
}
