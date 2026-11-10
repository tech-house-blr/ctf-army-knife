"use client";

/**
 * Last resort when the root layout itself fails: it replaces the whole document,
 * so it can't rely on the app's stylesheet or fonts.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#131416", color: "#e7e8ea", fontFamily: "system-ui, sans-serif" }}>
                <main style={{ maxWidth: "28rem", padding: "1.5rem" }}>
                    <h1 style={{ fontSize: "1.5rem", margin: 0 }}>CTF Army Knife failed to load</h1>
                    <p style={{ color: "#a0a4ab", lineHeight: 1.6 }}>Something went wrong before the page could start. Try again, or reload.</p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{ marginTop: "0.5rem", padding: "0.6rem 1rem", borderRadius: 7, border: 0, background: "#e7e8ea", color: "#131416", font: "inherit", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
