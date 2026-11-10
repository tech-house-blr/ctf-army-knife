"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { formatBytes } from "@/lib/format";

type FileDropProps = {
    file: File | null;
    onFile: (file: File) => void;
    accept?: string;
    maxBytes?: number;
    disabled?: boolean;
};

/** Reusable file picker: click, drag and drop, or paste (Ctrl+V) an image. */
export default function FileDrop({ file, onFile, accept, maxBytes, disabled }: FileDropProps) {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const preview = useMemo(() => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
    const [brokenPreview, setBrokenPreview] = useState<string | null>(null);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    function choose(candidate: File | undefined) {
        if (!candidate || disabled) return;
        if (maxBytes && candidate.size > maxBytes) {
            setError(`${candidate.name} is ${formatBytes(candidate.size)}. The limit is ${formatBytes(maxBytes)}.`);
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

    const showPreview = preview && brokenPreview !== preview;

    return (
        <div className="flex h-full flex-col">
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
                aria-label={file ? `Chosen file: ${file.name}. Choose another file` : "Choose a file"}
                className={`flex min-h-36 w-full flex-1 items-center gap-4 rounded-lg border border-dashed p-5 text-left transition-colors duration-100 disabled:cursor-progress disabled:opacity-60 ${
                    dragging ? "border-signal bg-signal-soft" : "border-line-strong bg-inset hover:border-fg-3"
                }`}
            >
                {file ? (
                    <>
                        {showPreview && (
                            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                            <img
                                src={preview}
                                alt=""
                                onError={() => setBrokenPreview(preview)}
                                className="size-20 shrink-0 rounded-md border border-line bg-panel object-contain [image-rendering:pixelated]"
                            />
                        )}
                        <span className="min-w-0">
                            <span className="block font-mono text-[0.9333rem] break-all text-fg">{file.name}</span>
                            <span className="mt-0.5 block text-sm text-fg-3 tabular-nums">{formatBytes(file.size)}</span>
                        </span>
                    </>
                ) : (
                    <span className="w-full text-center text-fg-2">
                        Drop, paste or choose a file{maxBytes ? ` up to ${formatBytes(maxBytes)}` : ""}
                    </span>
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
            {error && <p role="alert" className="error-text mt-2">{error}</p>}
        </div>
    );
}
