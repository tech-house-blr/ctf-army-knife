"use client";

import { useEffect, useRef, useState } from "react";

const channel = "ctf-army-knife:cyberchef:v1";
type Status = "loading" | "ready" | "error";

export default function CyberChefWorkspace({ entry }: { entry: string }) {
    const iframe = useRef<HTMLIFrameElement>(null);
    // Capture before the App Router's initial history replacement. URL
    // fragments are not present in the server's canonical URL.
    const initialHash = useRef(typeof window === "undefined" ? "" : window.location.hash);
    const currentHash = useRef("");
    const [source, setSource] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        let ready = false;
        const timeout = window.setTimeout(() => {
            if (!ready) setStatus("error");
        }, 60_000);

        const navigate = () => {
            if (window.location.hash === currentHash.current) return;
            currentHash.current = window.location.hash;
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

    return (
        <main className="chef-shell">
            <header className="flex min-h-10 items-center px-4 pt-6 pb-4 sm:px-6 xl:px-10">
                <h1 className="text-xl font-semibold tracking-tight">CyberChef</h1>
            </header>
            <div className="chef-frame panel mx-4 mb-4 sm:mx-6 sm:mb-6 xl:mx-10">
                {status !== "ready" && (
                    <div role={status === "error" ? "alert" : "status"} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-panel px-8 text-center">
                        {status === "loading" && <span className="chef-progress" aria-hidden="true" />}
                        <p className={status === "error" ? "error-text" : "text-fg-2"}>
                            {status === "error" ? "CyberChef could not finish loading." : "Loading CyberChef and its workers…"}
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
        </main>
    );
}
