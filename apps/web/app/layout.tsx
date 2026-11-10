import type { Metadata, Viewport } from "next";
import Sidebar from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
    title: "CTF Army Knife",
    description: "Self-hosted tools for capture-the-flag challenges: ciphers, encodings, steganography and forensics.",
};

export const viewport: Viewport = { themeColor: "#edede7" };

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <head>
                <link rel="preload" href="/fonts/archivo-variable.woff2" as="font" type="font/woff2" crossOrigin="" />
            </head>
            <body className="min-h-dvh">
                <a
                    href="#content"
                    className="sr-only z-50 bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
                >
                    Skip to content
                </a>
                <Sidebar />
                {/* The rail is fixed and 240px wide from 1280px up; keep content clear of it. */}
                <div id="content" className="flex min-w-0 flex-col xl:pl-60">{children}</div>
            </body>
        </html>
    );
}
