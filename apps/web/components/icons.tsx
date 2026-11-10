/**
 * Interface icons: one consistent set on a 24-unit grid, 1.5 stroke, round
 * joins, drawn at 18 px. Tool icons describe what the tool works on.
 */
const paths = {
    /** All tools: the index. */
    grid: "M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z",
    /** Cryptogram Solver: a cipher wheel (substitution). */
    cipher: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z M12 3v4.5 M12 16.5V21 M3 12h4.5 M16.5 12H21 M5.6 5.6l3.2 3.2 M15.2 15.2l3.2 3.2",
    /** GPG Decoder: a key. */
    key: "M7.5 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M11 12h9.5 M17.5 12v3 M14.5 12v2.5",
    /** CyberChef: a chef's hat. */
    chef: "M7 17.5h10 M7 17.5V20h10v-2.5 M7 17.5v-4.1A4 4 0 0 1 8.2 5.6 4.5 4.5 0 0 1 15.8 5.6 4 4 0 0 1 17 13.4v4.1",
    /** AperiSolve: stacked bit planes. */
    layers: "M12 4 3.5 8.5 12 13l8.5-4.5z M3.5 12.5 12 17l8.5-4.5 M3.5 16.5 12 21l8.5-4.5",
    /** Sidebar: collapse / expand. */
    sidebar: "M4 5h16v14H4z M9.5 5v14",
    theme: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z M12 3.5v17",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={paths[name]} />
            {name === "theme" && <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />}
        </svg>
    );
}
