import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/sidebar";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
    title: "CTF Army Knife",
    description: "Self-hosted tools for capture-the-flag challenges: ciphers, encodings, steganography and forensics.",
};

export const viewport: Viewport = { themeColor: "#131416" };

// Applies the saved theme before first paint, so a light-theme user never sees a dark flash.
const themeScript = `try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

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
                <Sidebar />
                {/* The rail is fixed and 232px wide from 1280px up; keep content clear of it. */}
                <div id="content" className="flex min-w-0 flex-col xl:pl-58">{children}</div>
            </body>
        </html>
    );
}
