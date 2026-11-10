"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { cyberChefLink, detectFile, detectText, type ToolSlug } from "@/lib/detect";
import { formatBytes } from "@/lib/format";
import { handOff } from "@/lib/handoff";
import { toolBySlug } from "@/lib/tools/registry";

/** Home page input: paste text or drop a file, then open it in the tool that fits. */
export default function SmartInput() {
    const router = useRouter();
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const picker = useRef<HTMLInputElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);

    const detection = file ? detectFile(file) : detectText(text);
    const preview = useMemo(() => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    function open(tool: ToolSlug) {
        if (tool === "cyberchef") {
            // A full navigation: the App Router drops the #recipe=...&input=... fragment
            // before the CyberChef page reads it on a client-side push.
            window.location.assign(cyberChefLink(text));
            return;
        }
        handOff(file ? { tool, file } : { tool, text });
        router.push(`/${tool}`);
    }

    function takeFile(candidate: File | undefined) {
        if (!candidate) return;
        setFile(candidate);
        setText("");
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files[0];
        if (dropped) takeFile(dropped);
        else setText(event.dataTransfer.getData("text/plain"));
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && detection) {
            event.preventDefault();
            open(detection.tools[0]);
        }
    }

    const [primary, ...others] = detection?.tools ?? [];

    return (
        <section
            aria-label="Open input in a tool"
            onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            onKeyDown={onKeyDown}
            className={`panel overflow-hidden transition-colors duration-100 focus-within:border-signal ${dragging ? "border-signal" : ""}`}
        >
            {file ? (
                <div className="flex min-h-44 items-center gap-4 bg-inset p-5">
                    {preview && (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                        <img src={preview} alt="" className="size-24 shrink-0 rounded-md border border-line bg-panel object-contain [image-rendering:pixelated]" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-[0.9333rem] break-all">{file.name}</p>
                        <p className="mt-0.5 text-sm text-fg-3 tabular-nums">{formatBytes(file.size)}</p>
                    </div>
                    <button type="button" onClick={() => { setFile(null); textarea.current?.focus(); }} className="btn btn-quiet self-start">
                        Clear
                    </button>
                </div>
            ) : (
                <textarea
                    ref={textarea}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onPaste={(event) => {
                        const pasted = event.clipboardData.files[0];
                        if (pasted) {
                            event.preventDefault();
                            takeFile(pasted);
                        }
                    }}
                    rows={6}
                    spellCheck={false}
                    aria-label="Text or file to analyze"
                    placeholder="Paste text or drop a file"
                    className={`block min-h-44 w-full resize-y bg-inset px-5 py-4 font-mono text-[0.9333rem] leading-relaxed text-fg outline-none placeholder:font-sans placeholder:text-base placeholder:text-fg-3 ${
                        dragging ? "bg-signal-soft" : ""
                    }`}
                />
            )}

            <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                {detection ? (
                    <p className="flex items-center gap-2 text-sm text-fg-2" aria-live="polite">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
                        {detection.label}
                    </p>
                ) : (
                    <button type="button" onClick={() => picker.current?.click()} className="btn btn-quiet -ml-2">
                        Choose a file
                    </button>
                )}
                <input ref={picker} type="file" hidden onChange={(event) => { takeFile(event.target.files?.[0]); event.target.value = ""; }} />

                {primary && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {others.map((slug) => (
                            <button key={slug} type="button" onClick={() => open(slug)} className="btn btn-quiet">
                                {toolBySlug(slug)?.name}
                            </button>
                        ))}
                        <button type="button" onClick={() => open(primary)} className="btn btn-primary" title="Ctrl+Enter">
                            <Icon name={toolBySlug(primary)!.icon} className="size-4" />
                            Open in {toolBySlug(primary)?.name}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
