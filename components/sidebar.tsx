"use client";

import { useState } from "react";
import Link from "next/link";

export default function Sidebar() {
    const [collapsed, setIsCollapsed] = useState(true);

    const menuItems = [
        { name: "Dashboard", href: "/" },
        { name: "QuipQuip", href: "/quipquip" },
        { name: "Cyberchef", href: "/cyberchef" },
        { name: "AperiSolve", href: "/aperisolve" },
        { name: "GPG Decoder", href: "/gpg-decoder" },
    ];

    return (
        <aside
            className={`fixed inset-y-0 left-0 ${collapsed ? "w-10" : "w-64"} ${collapsed ? "" : "border-r-2 border-amber-300"} z-20 bg-stone-800`}
        >
            <button
                onClick={() => setIsCollapsed(!collapsed)}
                className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-amber-300 hover:bg-stone-800 shadow-md transition-colors cursor-pointer"
            >
                {collapsed ? ">" : "X"}
            </button>
            {!collapsed && (
                <div
                    className="fixed left-64 top-0 z-10 bg-black/60 h-full w-full"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
            <nav
                className={`absolute w-full top-15 flex-1 space-y-2 p-3 h-full`}
            >
                {menuItems.map((item) => {
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-medium text-amber-300 hover:bg-stone-900 hover:text-amber-500 transition-all overflow-hidden ${collapsed ? "hidden" : ""}`}
                            title={collapsed ? item.name : ""}
                            onClick={() => {
                                setIsCollapsed(true);
                            }}
                        >
                            {!collapsed && (
                                <span className="animate-fadeIn">
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
