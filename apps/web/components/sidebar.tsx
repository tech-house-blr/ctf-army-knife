"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TechHouseMark, TechHouseWordmark } from "@/components/brand";
import { applyTheme, readTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

function ThemeToggle() {
    const theme = useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "dark");
    const next: Theme = theme === "dark" ? "light" : "dark";
    return (
        <button
            type="button"
            onClick={() => applyTheme(next)}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
            className="btn btn-quiet size-9 min-h-9 p-0"
        >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
            </svg>
        </button>
    );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const link = (href: string, label: string) => {
        const active = pathname === href;
        return (
            <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-9 items-center rounded-md px-3 text-[0.9333rem] no-underline transition-colors duration-100 ${
                    active ? "bg-raised font-medium text-fg" : "text-fg-2 hover:bg-raised/60 hover:text-fg"
                }`}
            >
                {active && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-signal" />}
                {label}
            </Link>
        );
    };

    return (
        <nav aria-label="Tools" className="flex flex-col gap-5">
            <div>{link("/", "All tools")}</div>
            {toolsByCategory().map((group) => (
                <div key={group.id} role="group" aria-labelledby={`nav-${group.id}`}>
                    <p id={`nav-${group.id}`} className="mb-1 px-3 text-xs font-medium text-fg-3">{group.label}</p>
                    <ul className="flex flex-col gap-0.5">
                        {group.tools.map((tool) => (
                            <li key={tool.slug}>{link(toolHref(tool), tool.name)}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/** A fixed rail on wide screens; a top bar with a full-screen menu below 1280px. */
export default function Sidebar() {
    const [open, setOpen] = useState(false);

    // Links close the menu themselves (onNavigate); Escape closes it too.
    useEffect(() => {
        if (!open) return;
        const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", close);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", close);
            document.body.style.overflow = "";
        };
    }, [open]);

    // Fixed pixel renditions (see brand.tsx): never scale these with CSS.
    const wordmark = (onClick?: () => void) => (
        <Link href="/" onClick={onClick} className="flex shrink-0 items-end gap-2 rounded-md no-underline" aria-label="Tech House BLR, CTF Army Knife home">
            <TechHouseMark className="shrink-0" />
            <TechHouseWordmark className="max-[359px]:hidden" />
        </Link>
    );

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col border-r border-line bg-rail px-4 pt-5 pb-4 xl:flex">
                <div className="px-3">{wordmark()}</div>
                <div className="mt-7 flex-1 overflow-y-auto pl-0">
                    <NavLinks />
                </div>
                <div className="flex justify-end">
                    <ThemeToggle />
                </div>
            </aside>

            <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-3 border-b border-line bg-rail/95 px-4 backdrop-blur sm:px-6 xl:hidden">
                {wordmark(() => setOpen(false))}
                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-controls="mobile-nav"
                        aria-label={open ? "Close navigation" : "Open navigation"}
                        className="btn btn-quiet min-h-9 px-3"
                    >
                        {open ? "Close" : "Tools"}
                    </button>
                </div>
            </header>
            {open && (
                <div id="mobile-nav" className="fixed inset-x-0 top-13 bottom-0 z-30 overflow-y-auto bg-rail px-4 pt-5 pb-10 sm:px-6 xl:hidden">
                    <NavLinks onNavigate={() => setOpen(false)} />
                </div>
            )}
        </>
    );
}
