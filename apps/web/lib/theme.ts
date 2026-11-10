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

type ViewTransitionDocument = Document & {
    startViewTransition?: (update: () => Promise<void> | void) => { ready: Promise<void> };
};

/**
 * Switch theme with a circular reveal growing from the centre of `source` (the
 * toggle that was clicked), using the View Transitions API. Falls back to an
 * instant swap where that's unsupported or the user prefers reduced motion.
 */
export function switchTheme(theme: Theme, source?: HTMLElement): void {
    const doc = document as ViewTransitionDocument;
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyTheme(theme);
        return;
    }
    const rect = source?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    // The browser drops :hover while a view transition runs, so the clicked
    // control would lose its highlight on click and get it back at the end.
    // data-held keeps it lit throughout (styled like :hover).
    if (source) source.dataset.held = "";
    document.documentElement.dataset.themeSwitching = "";
    // Only the CyberChef frame needs a moment to repaint (it follows via a
    // storage event); elsewhere the wait would just freeze the page on click.
    const hasFrame = document.querySelector("iframe") !== null;
    const transition = doc.startViewTransition(async () => {
        applyTheme(theme);
        if (hasFrame) await new Promise((resolve) => setTimeout(resolve, 40));
    });
    transition.ready
        .then(() =>
            document.documentElement
                .animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 620, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
                )
                .finished,
        )
        .catch(() => {})
        .finally(() => {
            delete document.documentElement.dataset.themeSwitching;
            if (source) delete source.dataset.held;
        });
}
