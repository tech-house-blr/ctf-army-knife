"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

function Wordmark({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
    return (
        <Link href="/" onClick={onNavigate} className="group block text-ink no-underline" aria-label="CTF Army Knife home">
            <span className={`display block ${compact ? "text-[1.375rem]" : "text-[2rem]"}`}>
                Army{compact ? " " : <br />}Knife
            </span>
        </Link>
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
                className={`flex min-h-11 items-center gap-3 py-2 text-[0.9375rem] no-underline decoration-2 underline-offset-4 hover:underline ${
                    active ? "font-bold text-ink" : "text-ink"
                }`}
            >
                <span aria-hidden="true" className={`size-2 shrink-0 ${active ? "bg-red" : "bg-transparent"}`} />
                {label}
            </Link>
        );
    };

    return (
        <nav aria-label="Tools" className="flex flex-col gap-6">
            <div>{link("/", "All tools")}</div>
            {toolsByCategory().map((group) => (
                <div key={group.id}>
                    <h2 className="border-b border-ink pb-1 text-[0.8125rem] font-semibold text-ink-2">{group.label}</h2>
                    <ul>
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

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r-2 border-ink bg-paper px-6 pt-7 pb-6 xl:flex">
                <Wordmark />
                <p className="mt-3 border-b-[3px] border-ink pb-5 text-sm text-ink-2">CTF toolkit by Tech House BLR</p>
                <div className="mt-6 flex-1 overflow-y-auto">
                    <NavLinks />
                </div>
            </aside>

            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-ink bg-paper px-4 sm:px-6 xl:hidden">
                <Wordmark compact onNavigate={() => setOpen(false)} />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-controls="mobile-nav"
                    aria-label={open ? "Close navigation" : "Open navigation"}
                    className="btn btn-secondary min-h-10 px-4 py-1.5"
                >
                    {open ? "Close" : "Tools"}
                </button>
            </header>
            {open && (
                <div id="mobile-nav" className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto bg-paper px-4 pt-6 pb-10 sm:px-6 xl:hidden">
                    <NavLinks onNavigate={() => setOpen(false)} />
                </div>
            )}
        </>
    );
}
