"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TechHouseLogo } from "@/components/brand";
import Icon, { type IconName } from "@/components/icons";
import { LINKS } from "@/lib/links";
import { readRailCollapsed, setRailCollapsed, subscribeRail } from "@/lib/rail";
import { readTheme, subscribeTheme, switchTheme, type Theme } from "@/lib/theme";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

// The collapsed rail is driven by html[data-rail="collapsed"] (set before first
// paint by the script in app/layout.tsx). Nothing in the rail changes layout when
// it collapses: the width animates and labels fade and slide, all on one curve
// (--ease-liquid, --rail-dur in globals.css), so the motion stays smooth. Faded
// labels stay in the accessibility tree, so links keep their names.
const fade =
    "whitespace-nowrap transition-[opacity,translate] duration-(--rail-dur) ease-(--ease-liquid) in-data-[rail=collapsed]:xl:-translate-x-2 in-data-[rail=collapsed]:xl:opacity-0";

const rowClass =
    "relative flex min-h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-[0.9333rem] text-fg-2 no-underline transition-colors duration-100 hover:bg-raised/60 hover:text-fg";

function useTheme(): Theme {
    return useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "dark");
}

/** Theme switch from a click: the new theme grows out of the clicked control. */
function switchFrom(event: MouseEvent<HTMLElement>, theme: Theme) {
    const rect = event.currentTarget.getBoundingClientRect();
    switchTheme(theme, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
}

function ThemeIcon({ theme }: { theme: Theme }) {
    return (
        <Icon
            name="theme"
            className={`size-4 shrink-0 transition-transform duration-500 ease-(--ease-liquid) ${theme === "light" ? "rotate-180" : ""}`}
        />
    );
}

/** Icon-only theme button for the mobile top bar. */
function ThemeButton() {
    const theme = useTheme();
    const next: Theme = theme === "dark" ? "light" : "dark";
    return (
        <button
            type="button"
            onClick={(event) => switchFrom(event, next)}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
            className="btn btn-quiet size-9 min-h-9 shrink-0 p-0"
        >
            <ThemeIcon theme={theme} />
        </button>
    );
}

function NavLinks({ onNavigate, rail = false }: { onNavigate?: () => void; rail?: boolean }) {
    const pathname = usePathname();
    const link = (href: string, label: string, icon: IconName) => {
        const active = pathname === href;
        return (
            <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={rail ? label : undefined}
                className={`relative flex min-h-9 items-center gap-3 rounded-md px-2.5 text-[0.9333rem] no-underline transition-colors duration-100 ${
                    active ? "bg-raised font-medium text-fg" : "text-fg-2 hover:bg-raised/60 hover:text-fg"
                }`}
            >
                {active && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-signal" />}
                <Icon name={icon} className={`size-[18px] shrink-0 ${active ? "text-signal" : ""}`} />
                <span className={`truncate ${rail ? fade : ""}`}>{label}</span>
            </Link>
        );
    };

    return (
        <nav aria-label="Tools" className="flex flex-col gap-5">
            <div>{link("/", "All tools", "grid")}</div>
            {toolsByCategory().map((group) => (
                <div key={group.id} role="group" aria-labelledby={`nav-${rail ? "r" : "m"}-${group.id}`}>
                    <div className="relative mb-1">
                        <p id={`nav-${rail ? "r" : "m"}-${group.id}`} className={`px-2.5 text-xs font-medium text-fg-3 ${rail ? fade : ""}`}>
                            {group.label}
                        </p>
                        {/* In the collapsed rail the heading cross-fades to a divider in the same spot, so nothing shifts. */}
                        {rail && (
                            <span
                                aria-hidden="true"
                                className="absolute inset-x-2.5 top-1/2 h-px bg-line opacity-0 transition-opacity duration-(--rail-dur) ease-(--ease-liquid) in-data-[rail=collapsed]:xl:opacity-100"
                            />
                        )}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                        {group.tools.map((tool) => (
                            <li key={tool.slug}>{link(toolHref(tool), tool.name, tool.icon)}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/** Project source, the Tech House website, Tech House socials behind Support, and (in the rail) theme and collapse. */
function FooterLinks({ rail = false }: { rail?: boolean }) {
    const [supportOpen, setSupportOpen] = useState(false);
    const theme = useTheme();
    const collapsed = useSyncExternalStore(subscribeRail, readRailCollapsed, () => false);
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    const label = (text: string) => <span className={`truncate ${rail ? fade : ""}`}>{text}</span>;
    const external = (href: string, text: string, icon: IconName, title?: string) => (
        <a href={href} target="_blank" rel="noopener noreferrer" title={rail ? (title ?? text) : undefined} className={rowClass}>
            <Icon name={icon} className="size-[18px] shrink-0" />
            {label(text)}
        </a>
    );
    return (
        <ul className="flex flex-col gap-0.5">
            <li>{external(LINKS.repo, "Source code", "github", "Source code on GitHub")}</li>
            <li>{external(LINKS.website, "Tech House", "globe", "Tech House website")}</li>
            <li>
                <button
                    type="button"
                    onClick={() => setSupportOpen(!supportOpen)}
                    aria-expanded={supportOpen}
                    aria-controls={`support-${rail ? "r" : "m"}`}
                    title={rail ? "Support Tech House" : undefined}
                    className={rowClass}
                >
                    <Icon name="heart" className={`size-[18px] shrink-0 ${supportOpen ? "text-signal" : ""}`} />
                    {label("Support")}
                    <Icon
                        name="chevron"
                        className={`ml-auto size-3.5 shrink-0 transition-[rotate,opacity] duration-(--rail-dur) ease-(--ease-liquid) ${supportOpen ? "-rotate-90" : "rotate-90"} ${
                            rail ? "in-data-[rail=collapsed]:xl:opacity-0" : ""
                        }`}
                    />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-(--rail-dur) ease-(--ease-liquid) ${supportOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul
                        id={`support-${rail ? "r" : "m"}`}
                        inert={!supportOpen}
                        className={`flex min-h-0 flex-col gap-0.5 overflow-hidden pt-0.5 pl-7 transition-[padding] duration-(--rail-dur) ease-(--ease-liquid) ${
                            rail ? "in-data-[rail=collapsed]:xl:pl-0" : ""
                        }`}
                    >
                        {LINKS.socials.map((social) => (
                            <li key={social.label}>{external(social.href, social.label, social.icon, `Tech House on ${social.label}`)}</li>
                        ))}
                    </ul>
                </div>
            </li>
            {rail && (
                <>
                    <li>
                        <button type="button" onClick={(event) => switchFrom(event, nextTheme)} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`} className={rowClass}>
                            <span className="grid size-[18px] shrink-0 place-items-center"><ThemeIcon theme={theme} /></span>
                            {label(nextTheme === "light" ? "Light theme" : "Dark theme")}
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() => setRailCollapsed(!collapsed)}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            aria-expanded={!collapsed}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className={rowClass}
                        >
                            <Icon name="sidebar" className="size-[18px] shrink-0" />
                            {label("Collapse")}
                        </button>
                    </li>
                </>
            )}
        </ul>
    );
}

/** A fixed, collapsible rail on wide screens; a top bar with a full-screen menu below 1280px. */
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
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--rail-w) flex-col overflow-hidden border-r border-line bg-rail px-3 pt-5 pb-3 transition-[width] duration-(--rail-dur) ease-(--ease-liquid) xl:flex">
                <div className="flex min-h-8 items-center px-0.5">
                    <Link href="/" className="rounded-md no-underline" aria-label="Tech House BLR, CTF Army Knife home">
                        {/* The wordmark folds away as the rail collapses, leaving the mark. */}
                        <TechHouseLogo wordmarkClassName="in-data-[rail=collapsed]:xl:max-w-0 in-data-[rail=collapsed]:xl:opacity-0" />
                    </Link>
                </div>
                <div className="mt-7 flex-1 overflow-x-hidden overflow-y-auto">
                    <NavLinks rail />
                </div>
                <div className="mt-3 border-t border-line pt-3">
                    <FooterLinks rail />
                </div>
            </aside>

            <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-3 border-b border-line bg-rail/95 px-4 backdrop-blur sm:px-6 xl:hidden">
                <Link href="/" onClick={() => setOpen(false)} className="shrink-0 rounded-md no-underline" aria-label="Tech House BLR, CTF Army Knife home">
                    <TechHouseLogo wordmarkClassName="max-[359px]:max-w-0 max-[359px]:opacity-0" />
                </Link>
                <div className="flex items-center gap-1">
                    <ThemeButton />
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
                    <div className="mt-6 border-t border-line pt-4">
                        <FooterLinks />
                    </div>
                </div>
            )}
        </>
    );
}
