/** Collapsed/expanded state of the desktop tool rail, saved like the theme. */
export const RAIL_STORAGE_KEY = "ctf-army-knife:rail";

const CHANGE_EVENT = "ctf-army-knife:rail-change";

export function readRailCollapsed(): boolean {
    return typeof document !== "undefined" && document.documentElement.dataset.rail === "collapsed";
}

export function setRailCollapsed(collapsed: boolean): void {
    if (collapsed) document.documentElement.dataset.rail = "collapsed";
    else delete document.documentElement.dataset.rail;
    try {
        localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
        /* storage blocked: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore. */
export function subscribeRail(onChange: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
