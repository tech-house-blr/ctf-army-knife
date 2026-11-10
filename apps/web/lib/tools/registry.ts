import type { ToolIconName } from "@/components/tool-icon";

/**
 * Single source of truth for every tool in the app. The sidebar and dashboard
 * read from this list, so adding a tool means one entry here plus its route at
 * app/<slug>/page.tsx (and, if it needs server-side work, a router in apps/api).
 */
export type Tool = {
    /** URL segment, kebab-case. The route lives at app/<slug>/page.tsx. */
    slug: string;
    name: string;
    description: string;
    icon: ToolIconName;
    category: "crypto" | "encoding" | "forensics" | "stego";
    status: "ready" | "planned";
    /** True when the tool calls the Python API in apps/api. */
    needsApi?: boolean;
};

export const tools: readonly Tool[] = [
    {
        slug: "cryptogram-solver",
        name: "Cryptogram Solver",
        description: "Break monoalphabetic substitution ciphers with frequency analysis and simulated annealing.",
        icon: "cipher",
        category: "crypto",
        status: "ready",
        needsApi: true,
    },
    {
        slug: "cyberchef",
        name: "CyberChef",
        description: "The full CyberChef operation catalog, served locally.",
        icon: "lab",
        category: "encoding",
        status: "ready",
    },
    {
        slug: "aperisolve",
        name: "AperiSolve",
        description: "Image steganography analysis: bit planes, metadata, binwalk, steghide, zsteg and more.",
        icon: "image",
        category: "stego",
        status: "ready",
        needsApi: true,
    },
    {
        slug: "gpg-decoder",
        name: "GPG Decoder",
        description: "Inspect OpenPGP packets in armored or binary messages.",
        icon: "key",
        category: "crypto",
        status: "ready",
    },
];

export const toolHref = (tool: Tool) => `/${tool.slug}`;
