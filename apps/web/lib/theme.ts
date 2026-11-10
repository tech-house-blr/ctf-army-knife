/** Shared with integration/cyberchef/bridge.js, which applies the same theme inside CyberChef. */
export const THEME_STORAGE_KEY = "ctf-army-knife:theme";

export type Theme = "dark" | "light";

const CHANGE_EVENT = "ctf-army-knife:theme-change";

export function readTheme(): Theme {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore: notifies on toggles here and in other tabs. */
export function subscribeTheme(onChange: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key !== THEME_STORAGE_KEY) return;
        if (event.newValue === "light") document.documentElement.dataset.theme = "light";
        else delete document.documentElement.dataset.theme;
        onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onStorage);
    };
}
