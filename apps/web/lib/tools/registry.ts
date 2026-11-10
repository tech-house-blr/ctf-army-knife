import type { IconName } from "@/components/icons";

/**
 * Single source of truth for every tool in the app. The sidebar and dashboard
 * read from this list, so adding a tool means one entry here plus its route at
 * app/<slug>/page.tsx (and, if it needs server-side work, a router in apps/api).
 */
export type Tool = {
    /** URL segment, kebab-case. The route lives at app/<slug>/page.tsx. */
    slug: string;
    name: string;
    /** Browser tab title: as short as possible. */
    title: string;
    icon: IconName;
    description: string;
    category: "crypto" | "encoding" | "forensics" | "stego";
    status: "ready" | "planned";
    /** True when the tool calls the Python API in apps/api. */
    needsApi?: boolean;
};

export const tools: readonly Tool[] = [
    {
        slug: "cryptogram-solver",
        name: "Cryptogram Solver",
        title: "Cryptogram",
        icon: "cipher",
        description: "Break monoalphabetic substitution ciphers with frequency analysis and simulated annealing.",
        category: "crypto",
        status: "ready",
        needsApi: true,
    },
    {
        slug: "cyberchef",
        name: "CyberChef",
        title: "CyberChef",
        icon: "chef",
        description: "The full CyberChef operation catalog, served locally.",
        category: "encoding",
        status: "ready",
    },
    {
        slug: "aperisolve",
        name: "AperiSolve",
        title: "AperiSolve",
        icon: "layers",
        description: "Image steganography analysis: bit planes, metadata, binwalk, steghide, zsteg and more.",
        category: "stego",
        status: "ready",
        needsApi: true,
    },
    {
        slug: "gpg-decoder",
        name: "GPG Decoder",
        title: "GPG",
        icon: "key",
        description: "Inspect OpenPGP packets in armored or binary messages.",
        category: "crypto",
        status: "ready",
    },
];

export const toolHref = (tool: Tool) => `/${tool.slug}`;

/** Display names for categories, in the order they appear in navigation. */
export const categories: readonly { id: Tool["category"]; label: string }[] = [
    { id: "crypto", label: "Crypto" },
    { id: "encoding", label: "Encoding" },
    { id: "stego", label: "Steganography" },
    { id: "forensics", label: "Forensics" },
];

/** Categories that have at least one tool, each with its tools. */
export const toolsByCategory = () =>
    categories
        .map((category) => ({ ...category, tools: tools.filter((tool) => tool.category === category.id) }))
        .filter((group) => group.tools.length > 0);

export const toolBySlug = (slug: string) => tools.find((tool) => tool.slug === slug);

/** Page metadata for a tool route: just its short title. */
export function toolMetadata(slug: string) {
    const tool = toolBySlug(slug);
    if (!tool) throw new Error(`Unknown tool: ${slug}`);
    return { title: tool.title };
}

