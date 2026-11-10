"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown in the normal layout when a page throws while rendering. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return (
        <main className="w-full max-w-295 px-4 pt-16 pb-16 sm:px-6 sm:pt-24 xl:px-10">
            <p className="font-mono text-sm text-danger">Error</p>
            <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">This page broke</h1>
            <p className="mt-4 max-w-[52ch] text-fg-2">
                Something went wrong while showing it. Try again; if it keeps happening, reload the page.
            </p>
            {error.digest && <p className="mt-3 font-mono text-sm text-fg-3">Reference {error.digest}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
                <Link href="/" className="btn">Back to all tools</Link>
            </div>
        </main>
    );
}
