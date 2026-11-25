"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { syntaxModules } from "@/lib/tools/sigma-shift/syntax";
import type { Language } from "@/lib/tools/sigma-shift/syntax";

function HighlightedText({ value, language }: { value: string; language: Language }) {
    const syntax = syntaxModules[language];
    const pieces: React.ReactNode[] = [];
    let cursor = 0;
    for (const match of value.matchAll(syntax.pattern)) {
        const index = match.index ?? 0;
        if (index > cursor) pieces.push(value.slice(cursor, index));
        pieces.push(<span key={`${index}-${match[0]}`} className={syntax.classify(match[0])}>{match[0]}</span>);
        cursor = index + match[0].length;
    }
    if (cursor < value.length) pieces.push(value.slice(cursor));
    return <>{pieces}{value.endsWith("\n") ? " " : null}</>;
}

/** Textarea editor with a synchronized, non-interactive syntax-colour layer. */
export default function CodeEditor({
    value,
    onChange,
    language,
    label,
    minHeight = "20rem",
    readOnly = false,
}: {
    value: string;
    onChange?: (value: string) => void;
    language: Language;
    label: string;
    minHeight?: string;
    readOnly?: boolean;
}) {
    const [scrollTop, setScrollTop] = useState(0);
    function update(event: ChangeEvent<HTMLTextAreaElement>) {
        onChange?.(event.target.value);
    }

    return (
        <div className="code-editor relative min-w-0 bg-inset" style={{ minHeight, height: minHeight }}>
            <pre aria-hidden="true" className="code-editor-highlight absolute inset-0 m-0 overflow-hidden px-4 py-4 font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word sm:px-5">
                <span className="block" style={{ transform: `translateY(-${scrollTop}px)` }}>
                    {value ? <HighlightedText value={value} language={language} /> : <span className="code-token-placeholder">Start typing…</span>}
                </span>
            </pre>
            <textarea
                aria-label={label}
                value={value}
                onChange={update}
                onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                readOnly={readOnly}
                wrap="soft"
                className={`code-editor-input field absolute inset-0 h-full w-full resize-none rounded-none border-0 bg-transparent px-4 py-4 font-mono text-sm leading-relaxed sm:px-5 ${readOnly ? "cursor-text" : ""}`}
            />
        </div>
    );
}
