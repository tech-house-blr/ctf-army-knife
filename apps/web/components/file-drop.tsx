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
        <div className="w-full max-w-4xl">
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
                className={`flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-amber-300 transition disabled:cursor-wait disabled:opacity-60 ${
                    dragging ? "border-amber-200 bg-amber-300/10" : "border-amber-300 hover:bg-amber-300/5"
                }`}
            >
                {file ? (
                    <>
                        <span className="font-mono break-all">{file.name}</span>
                        <span className="text-sm text-stone-300">{formatBytes(file.size)} · click or drop to replace</span>
                    </>
                ) : (
                    <>
                        <span className="text-lg">Drop a file here, click to choose, or paste</span>
                        {hint && <span className="text-sm text-stone-300">{hint}</span>}
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
                <p role="alert" className="mt-2 text-sm text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}
