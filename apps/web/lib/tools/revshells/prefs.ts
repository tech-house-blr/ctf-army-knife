// Per-browser memory of the reverse-shell form's connection details, shaped for
// useSyncExternalStore so the page restores them without a hydration mismatch
// (the server snapshot is always the defaults) and without setState in an
// effect. Only convenience fields live here; nothing is sent anywhere.
import { ENCODINGS, shells } from "./index.ts";
import type { Encoding } from "./types.ts";

export type RevshellPrefs = { ip: string; port: string; shell: string; encoding: Encoding };

const DEFAULTS: RevshellPrefs = { ip: "10.10.10.10", port: "9001", shell: "bash", encoding: "None" };
const STORAGE_KEY = "ctf-army-knife:revshells";
const CHANGE_EVENT = "ctf-army-knife:revshells-change";

// Cached so getSnapshot returns a stable reference until something changes.
let cache: RevshellPrefs | null = null;

function sanitise(raw: unknown): RevshellPrefs {
    const value = (raw ?? {}) as Partial<Record<keyof RevshellPrefs, unknown>>;
    return {
        ip: typeof value.ip === "string" ? value.ip : DEFAULTS.ip,
        port: typeof value.port === "string" ? value.port : DEFAULTS.port,
        shell: typeof value.shell === "string" && shells.includes(value.shell) ? value.shell : DEFAULTS.shell,
        encoding: ENCODINGS.some((e) => e.id === value.encoding) ? (value.encoding as Encoding) : DEFAULTS.encoding,
    };
}

/** Client snapshot: the stored prefs, or defaults when storage is empty/blocked. */
export function readPrefs(): RevshellPrefs {
    if (typeof window === "undefined") return DEFAULTS;
    if (!cache) {
        try {
            cache = sanitise(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"));
        } catch {
            cache = DEFAULTS;
        }
    }
    return cache;
}

/** Server snapshot: always the defaults, so SSR and hydration agree. */
export function serverPrefs(): RevshellPrefs {
    return DEFAULTS;
}

export function setPrefs(patch: Partial<RevshellPrefs>): void {
    cache = { ...readPrefs(), ...patch };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
        /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePrefs(onChange: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
