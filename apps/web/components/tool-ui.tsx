"use client";

import { useEffect, useRef, useState } from "react";

/** Copy button that briefly confirms, degrading quietly without clipboard access. */
export function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    return (
        <button
            type="button"
            className="btn btn-quiet h-8 min-h-8 px-2.5 text-[0.8333rem]"
            disabled={disabled}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => setCopied(false), 1200);
                } catch {
                    /* clipboard unavailable: no-op */
                }
            }}
        >
            {copied ? "Copied" : label}
        </button>
    );
}

/** A labelled field wrapper. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="field-label">{label}</span>
            {children}
        </label>
    );
}
