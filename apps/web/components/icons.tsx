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
    /** The Tech House website. */
    globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9 M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9",
    /** Support: Tech House socials. */
    heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z",
    instagram: "M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5z M17 7h.01",
    chevron: "M9 6l6 6-6 6",
} as const;

// Third-party marks, drawn filled as their owners publish them (paths from Simple Icons, CC0).
const marks = {
    github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
} as const;

export type IconName = keyof typeof paths | keyof typeof marks;

export default function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
    if (name in marks) {
        return (
            // Filled marks read heavier than the 1.5-stroke icons; inset them to match.
            <svg className={className} viewBox="-3 -3 30 30" fill="currentColor" aria-hidden="true">
                <path d={marks[name as keyof typeof marks]} />
            </svg>
        );
    }
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
            <path d={paths[name as keyof typeof paths]} />
            {name === "theme" && <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />}
        </svg>
    );
}
