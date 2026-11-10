"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TechHouseMark, TechHouseWordmark } from "@/components/brand";
import Icon, { type IconName } from "@/components/icons";
import { LINKS } from "@/lib/links";
import { readRailCollapsed, setRailCollapsed, subscribeRail } from "@/lib/rail";
import { applyTheme, readTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

// The collapsed rail is driven by html[data-rail="collapsed"] (set before first
// paint by the script in app/layout.tsx), so these variants apply without a flash.
// Labels become sr-only rather than hidden, so links keep their accessible names.
const whenCollapsed = {
    label: "in-data-[rail=collapsed]:xl:sr-only",
    hide: "in-data-[rail=collapsed]:xl:hidden",
};

function ThemeToggle() {
    const theme = useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "dark");
    const next: Theme = theme === "dark" ? "light" : "dark";
    return (
        <button
            type="button"
            onClick={() => applyTheme(next)}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
            className="btn btn-quiet size-9 min-h-9 shrink-0 p-0"
        >
            <Icon name="theme" className="size-4" />
        </button>
    );
}

function CollapseToggle() {
    const collapsed = useSyncExternalStore(subscribeRail, readRailCollapsed, () => false);
    const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
    return (
        <button
            type="button"
            onClick={() => setRailCollapsed(!collapsed)}
            aria-label={label}
            aria-expanded={!collapsed}
            title={label}
            className="btn btn-quiet size-9 min-h-9 shrink-0 p-0"
        >
            <Icon name="sidebar" className="size-[18px]" />
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
                <span className={`truncate ${rail ? whenCollapsed.label : ""}`}>{label}</span>
            </Link>
        );
    };

    return (
        <nav aria-label="Tools" className="flex flex-col gap-5">
            <div>{link("/", "All tools", "grid")}</div>
            {toolsByCategory().map((group) => (
                <div key={group.id} role="group" aria-labelledby={`nav-${rail ? "r" : "m"}-${group.id}`}>
                    <p
                        id={`nav-${rail ? "r" : "m"}-${group.id}`}
                        className={`mb-1 px-2.5 text-xs font-medium text-fg-3 ${rail ? whenCollapsed.label : ""}`}
                    >
                        {group.label}
                    </p>
                    {rail && <div aria-hidden="true" className="mx-2.5 mb-2 hidden border-t border-line in-data-[rail=collapsed]:xl:block" />}
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

const rowClass =
    "relative flex min-h-9 w-full items-center gap-3 rounded-md px-2.5 text-[0.9333rem] text-fg-2 no-underline transition-colors duration-100 hover:bg-raised/60 hover:text-fg";

/** Project source, the Tech House website, and Tech House socials behind Support. */
function FooterLinks({ rail = false }: { rail?: boolean }) {
    const [supportOpen, setSupportOpen] = useState(false);
    const label = (text: string) => <span className={`truncate ${rail ? whenCollapsed.label : ""}`}>{text}</span>;
    const external = (href: string, text: string, icon: IconName, extraLabel?: string) => (
        <a href={href} target="_blank" rel="noopener noreferrer" title={rail ? (extraLabel ?? text) : undefined} className={rowClass}>
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
                        className={`ml-auto size-3.5 shrink-0 transition-transform duration-150 ${supportOpen ? "-rotate-90" : "rotate-90"} ${rail ? whenCollapsed.hide : ""}`}
                    />
                </button>
                {supportOpen && (
                    <ul id={`support-${rail ? "r" : "m"}`} className={`mt-0.5 flex flex-col gap-0.5 pl-7 ${rail ? "in-data-[rail=collapsed]:xl:pl-0" : ""}`}>
                        {LINKS.socials.map((social) => (
                            <li key={social.label}>{external(social.href, social.label, social.icon, `Tech House on ${social.label}`)}</li>
                        ))}
                    </ul>
                )}
            </li>
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

    // Fixed pixel renditions (see brand.tsx): never scale these with CSS.
    const logo = (onClick?: () => void, collapsible = false) => (
        <Link href="/" onClick={onClick} className="flex shrink-0 items-end gap-2 rounded-md no-underline" aria-label="Tech House BLR, CTF Army Knife home">
            <TechHouseMark className="shrink-0" />
            <TechHouseWordmark className={`max-[359px]:hidden ${collapsible ? whenCollapsed.hide : ""}`} />
        </Link>
    );

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--rail-w) flex-col overflow-hidden border-r border-line bg-rail px-3 pt-5 pb-3 transition-[width] duration-150 xl:flex">
                <div className="flex min-h-7 items-end px-2.5 in-data-[rail=collapsed]:px-[9px]">{logo(undefined, true)}</div>
                <div className="mt-7 flex-1 overflow-x-hidden overflow-y-auto">
                    <NavLinks rail />
                </div>
                <div className="mt-3 border-t border-line pt-3">
                    <FooterLinks rail />
                </div>
                <div className="mt-2 flex items-center justify-between gap-1 in-data-[rail=collapsed]:flex-col-reverse">
                    <CollapseToggle />
                    <ThemeToggle />
                </div>
            </aside>

            <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-3 border-b border-line bg-rail/95 px-4 backdrop-blur sm:px-6 xl:hidden">
                {logo(() => setOpen(false))}
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
                    <div className="mt-6 border-t border-line pt-4">
                        <FooterLinks />
                    </div>
                </div>
            )}
        </>
    );
}
