"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ToolIcon, { type ToolIconName } from "@/components/tool-icon";

export default function Sidebar() {
    const [collapsed, setIsCollapsed] = useState(true);
    const pathname = usePathname();

    const menuItems: { name: string; href: string; icon: ToolIconName; number: string }[] = [
        { name: "Dashboard", href: "/", icon: "grid", number: "00" },
        { name: "Cryptogram Solver", href: "/cryptogramSolver", icon: "cipher", number: "01" },
        { name: "CyberChef", href: "/cyberchef", icon: "lab", number: "02" },
        { name: "AperiSolve", href: "/aperisolve", icon: "image", number: "03" },
        { name: "GPG Decoder", href: "/gpgDecoder", icon: "key", number: "04" },
    ];

    return (
        <>
        {!collapsed && <button type="button" className="tool-nav-backdrop" aria-label="Dismiss navigation" onClick={() => setIsCollapsed(true)} />}
        <aside className={`tool-nav ${collapsed ? "" : "tool-nav--expanded"}`}>
            <Link href="/" className="tool-brand" aria-label="CTF Army Knife home" onClick={() => setIsCollapsed(true)}>
                <span className="tool-brand-mark"><ToolIcon name="terminal" /></span>
                {!collapsed && <span className="tool-brand-name">ARMY KNIFE<small>TECH HOUSE · BLR</small></span>}
            </Link>
            <button
                type="button"
                aria-label={collapsed ? "Open navigation" : "Close navigation"}
                aria-expanded={!collapsed}
                onClick={() => setIsCollapsed(!collapsed)}
                className="tool-nav-toggle"
            >
                <ToolIcon name={collapsed ? "menu" : "close"} />
                {!collapsed && <span>Tool directory</span>}
            </button>
            <nav className="tool-nav-links" aria-label="Tools">
                {menuItems.map((item) => {
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`tool-nav-link ${pathname === item.href ? "is-active" : ""}`}
                            aria-label={item.name}
                            aria-current={pathname === item.href ? "page" : undefined}
                            title={item.name}
                            onClick={() => {
                                setIsCollapsed(true);
                            }}
                        >
                            <ToolIcon name={item.icon} />
                            {!collapsed && <><span>{item.name}</span><small>{item.number}</small></>}
                        </Link>
                    );
                })}
            </nav>
            <div className="tool-nav-footer"><span className="tool-community-mark">TH</span>{!collapsed && <span>Built for the curious.<small>A Tech House community project</small></span>}</div>
        </aside>
        </>
    );
}
