"use client";

import { useEffect, useRef, useState } from "react";

const channel = "ctf-army-knife:cyberchef:v1";
type Status = "loading" | "ready" | "error";

export default function CyberChefWorkspace({ entry, version }: { entry: string; version: string }) {
    const iframe = useRef<HTMLIFrameElement>(null);
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
            currentHash.current = window.location.hash;
            setDirectLink(entry + currentHash.current);
            iframe.current?.contentWindow?.postMessage(
                { channel, type: "navigate", hash: currentHash.current }, window.location.origin,
            );
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
            currentHash.current = window.location.hash;
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
        <main className="ml-16 flex h-dvh min-h-96 flex-col bg-stone-800 text-stone-100">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-600 px-4 py-3">
                <div>
                    <h1 className="text-xl font-semibold text-amber-300">CyberChef</h1>
                    <p className="text-xs text-stone-300">Community build · v{version} · Powered by GCHQ CyberChef</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <button onClick={copyLink} className="rounded border border-stone-500 px-3 py-2 text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300">Copy workspace link</button>
                    <a href={directLink} target="_blank" rel="noopener noreferrer" className="rounded border border-stone-500 px-3 py-2 text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300">Open workspace directly</a>
                    <span role="status" className="text-xs text-stone-300">{copyStatus}</span>
                </div>
            </header>
            <div className="relative min-h-0 flex-1">
                {status !== "ready" && (
                    <div role={status === "error" ? "alert" : "status"} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-stone-800 px-6 text-center">
                        <p>{status === "error" ? "CyberChef could not finish loading. Retry or open the workspace directly." : "Loading CyberChef and its workers…"}</p>
                        {status === "error" && <button onClick={retry} className="rounded bg-amber-300 px-4 py-2 font-medium text-stone-900">Retry loading</button>}
                    </div>
                )}
                {source && (
                    <iframe
                        key={attempt}
                        ref={iframe}
                        title="CyberChef workspace"
                        src={source}
                        className="h-full w-full border-0"
                        allow="clipboard-read; clipboard-write; fullscreen"
                        onLoad={() => iframe.current?.contentWindow?.postMessage({ channel, type: "ping" }, window.location.origin)}
                        onError={() => setStatus("error")}
                    />
                )}
            </div>
        </main>
    );
}
