const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    cipher: "M4 5h16 M4 12h16 M4 19h16 M8 2v6 M16 9v6 M10 16v6",
    lab: "M9 3h6 M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3 M8 14h8 M10 17h.01 M14 18h.01",
    image: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M3 16l5-5 5 5 3-3 5 5 M15 7h.01",
    key: "M14 3a7 7 0 0 0-6.7 9L2 17.3V22h5v-3h3v-3l1-1A7 7 0 1 0 14 3z M17 7h.01",
    menu: "M4 7h16 M4 12h16 M4 17h16",
    close: "M6 6l12 12 M6 18L18 6",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    external: "M14 3h7v7 M21 3L10 14 M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6",
    link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
    terminal: "M5 6l6 6-6 6 M13 18h6",
    check: "M5 12l4 4L19 6",
} as const;

export type ToolIconName = keyof typeof paths;

export default function ToolIcon({ name, className }: { name: ToolIconName; className?: string }) {
    return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
