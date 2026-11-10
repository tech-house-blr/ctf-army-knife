"use client";

import { useEffect, useRef, useState } from "react";
import ToolIcon from "@/components/tool-icon";

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
            <header className="chef-header">
                <div className="chef-heading-row">
                    <div><div className="chef-heading"><ToolIcon name="lab" /><h1>CyberChef</h1></div><p className="chef-description">Decode, transform, explore.</p></div>
                    <div className="chef-actions">
                        <button onClick={copyLink} className="chef-button" aria-label="Copy workspace link"><ToolIcon name={copyStatus === "Link copied" ? "check" : "link"} /><span>{copyStatus === "Link copied" ? "Copied" : "Copy link"}</span></button>
                        <a href={directLink} target="_blank" rel="noopener noreferrer" className="chef-button" aria-label="Open workspace directly"><span>Open separately</span><ToolIcon name="external" /></a>
                    </div>
                </div>
            </header>
            <div className="chef-workspace-frame">
                {status !== "ready" && (
                    <div role={status === "error" ? "alert" : "status"} className="chef-loading">
                        <span className={`chef-loading-mark ${status === "loading" ? "is-loading" : ""}`}><ToolIcon name="lab" /></span>
                        <p>{status === "error" ? "CyberChef could not finish loading. Retry or open the workspace directly." : "Loading CyberChef and its workers…"}</p>
                        {status === "error" && <button onClick={retry} className="chef-button chef-button--primary">Retry loading</button>}
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
            <footer className="chef-footer"><span className={`chef-live-status ${status === "ready" ? "is-ready" : ""}`}><i />{status === "ready" ? "Workspace ready" : status === "error" ? "Connection interrupted" : "Preparing workspace"}</span><span className="chef-copy-status" role="status">{copyStatus}</span><span className="chef-credit">Powered by GCHQ CyberChef <span>v{version}</span></span></footer>
        </main>
    );
}
