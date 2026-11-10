"use client";

import { useEffect, useRef, useState } from "react";

const channel = "ctf-army-knife:cyberchef:v1";
type Status = "loading" | "ready" | "error";

export default function CyberChefWorkspace({ entry, version }: { entry: string; version: string }) {
    const iframe = useRef<HTMLIFrameElement>(null);
    // Capture before the App Router's initial history replacement. URL
    // fragments are not present in the server's canonical URL.
    const initialHash = useRef(typeof window === "undefined" ? "" : window.location.hash);
    const currentHash = useRef("");
    const [source, setSource] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<Status>("loading");
    const [directLink, setDirectLink] = useState(entry);
    const [copyStatus, setCopyStatus] = useState("");

    useEffect(() => {
        let ready = false;
        const timeout = window.setTimeout(() => {
            if (!ready) setStatus("error");
        }, 60_000);

        const navigate = () => {
            if (window.location.hash === currentHash.current) return;
            currentHash.current = window.location.hash;
            setDirectLink(entry + currentHash.current);
            // History traversal starts a clean worker session. Old asynchronous
            // input updates must not overwrite the destination recipe.
            setStatus("loading");
            setSource(null);
            setAttempt((value) => value + 1);
        };
        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow) return;
            const message = event.data;
            if (!message || message.channel !== channel) return;
            if (message.type === "error") {
                if (!ready) setStatus("error");
                return;
            }
            if (message.type !== "ready" && message.type !== "hash") return;
            if (typeof message.hash !== "string" || (message.hash !== "" && !message.hash.startsWith("#"))) return;
            if (message.type === "ready") {
                ready = true;
                window.clearTimeout(timeout);
                setStatus("ready");
                if (message.hash !== currentHash.current) {
                    navigate();
                    return;
                }
            }
            if (!ready) return;
            currentHash.current = message.hash;
            setDirectLink(entry + message.hash);
            if (window.location.hash !== message.hash) {
                window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + message.hash);
            }
        };

        window.addEventListener("message", receive);
        window.addEventListener("hashchange", navigate);
        window.addEventListener("popstate", navigate);
        // Initialize from the browser URL after listeners are established.
        const animation = window.requestAnimationFrame(() => {
            currentHash.current = attempt === 0 ? initialHash.current : window.location.hash;
            if (window.location.hash !== currentHash.current) {
                window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + currentHash.current);
            }
            setDirectLink(entry + currentHash.current);
            setSource(entry + currentHash.current);
        });

        return () => {
            window.clearTimeout(timeout);
            window.cancelAnimationFrame(animation);
            window.removeEventListener("message", receive);
            window.removeEventListener("hashchange", navigate);
            window.removeEventListener("popstate", navigate);
        };
    }, [entry, attempt]);

    function retry() {
        setStatus("loading");
        setSource(null);
        setAttempt((previous) => previous + 1);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyStatus("Link copied");
        } catch {
            setCopyStatus("Copy the link from your browser’s address bar.");
        }
    }

    return (
        <main className="chef-shell">
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-4 pt-6 pb-5 sm:px-6 xl:px-8">
                <div>
                    <h1 className="display text-[clamp(2.25rem,4.5vw,3.75rem)]">CyberChef</h1>
                    <p className="mt-3 text-ink-2">Encode, decode, hash and transform data with recipes. Runs in your browser.</p>
                </div>
                <div className="flex w-full gap-3 sm:w-auto">
                    <button onClick={copyLink} className="btn btn-secondary flex-1 sm:flex-none" aria-label="Copy workspace link">
                        {copyStatus === "Link copied" ? "Copied" : "Copy link"}
                    </button>
                    <a href={directLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1 sm:flex-none" aria-label="Open workspace directly">
                        Open in new tab
                    </a>
                </div>
            </header>
            <div className="chef-frame">
                {status !== "ready" && (
                    <div role={status === "error" ? "alert" : "status"} className="absolute inset-0 z-10 flex flex-col items-start justify-center gap-5 bg-paper px-8">
                        {status === "loading" && <span className="chef-loading-bar" aria-hidden="true" />}
                        <p className={`max-w-[46ch] text-lg ${status === "error" ? "alert" : ""}`}>
                            {status === "error" ? "CyberChef could not finish loading. Retry, or open the workspace in a new tab." : "Loading CyberChef and its workers…"}
                        </p>
                        {status === "error" && <button onClick={retry} className="btn btn-primary">Retry loading</button>}
                    </div>
                )}
                {source && (
                    <iframe
                        key={attempt}
                        ref={iframe}
                        title="CyberChef workspace"
                        src={source}
                        className="chef-iframe"
                        allow="clipboard-read; clipboard-write; fullscreen"
                        onLoad={() => iframe.current?.contentWindow?.postMessage({ channel, type: "ping" }, window.location.origin)}
                        onError={() => setStatus("error")}
                    />
                )}
            </div>
            <footer className="flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-sm text-ink-2 sm:px-6 xl:px-8">
                <span className="flex items-center gap-2">
                    <span aria-hidden="true" className={`size-2 ${status === "ready" ? "bg-ink" : status === "error" ? "bg-red" : "border-2 border-ink-2"}`} />
                    {status === "ready" ? "Workspace ready" : status === "error" ? "Connection interrupted" : "Preparing workspace"}
                </span>
                <span role="status" className="font-semibold text-ink">{copyStatus}</span>
                <span>GCHQ CyberChef {version && <span className="font-mono">v{version}</span>}</span>
            </footer>
        </main>
    );
}
