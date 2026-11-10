import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/sidebar";
import { RAIL_STORAGE_KEY } from "@/lib/rail";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
    // The home page tab says the full name; each tool page sets just its own short name.
    title: "CTF Army Knife",
    description: "Self-hosted tools for capture-the-flag challenges: ciphers, encodings, steganography and forensics.",
};

export const viewport: Viewport = { themeColor: "#131416" };

// Applies the saved theme and rail state before first paint, so neither flashes.
const themeScript = `try{var d=document.documentElement.dataset;if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light")d.theme="light";if(localStorage.getItem(${JSON.stringify(RAIL_STORAGE_KEY)})==="collapsed")d.rail="collapsed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <link rel="preload" href="/fonts/bbh-hegarty.ttf" as="font" type="font/ttf" crossOrigin="" />
                <link rel="preload" href="/fonts/ibm-plex-sans-400.woff2" as="font" type="font/woff2" crossOrigin="" />
                <link rel="preload" href="/fonts/ibm-plex-sans-500.woff2" as="font" type="font/woff2" crossOrigin="" />
            </head>
            <body className="min-h-dvh">
                <a
                    href="#content"
                    className="sr-only z-50 rounded-md bg-fg px-4 py-2 text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
                >
                    Skip to content
                </a>
                <noscript>
                    <p className="border-b border-line bg-raised px-4 py-2 text-center text-sm text-fg">
                        CTF Army Knife needs JavaScript: every tool runs in the page. Turn it on and reload.
                    </p>
                </noscript>
                <Sidebar />
                {/* The rail is fixed from 1280px up (--rail-w, narrower when collapsed); keep content clear of it. */}
                <div id="content" className="flex min-w-0 flex-col transition-[padding] duration-(--rail-dur) ease-(--ease-liquid) xl:pl-(--rail-w)">{children}</div>
            </body>
        </html>
    );
}
