import { toolBySlug } from "@/lib/tools/registry";

/** A tool page's title row: the name, and optional actions on the right. */
export default function PageHeader({ slug, actions }: { slug: string; actions?: React.ReactNode }) {
    const tool = toolBySlug(slug);
    if (!tool) throw new Error(`Unknown tool: ${slug}`);
    return (
        <header className="flex min-h-10 flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{tool.name}</h1>
            {actions && <div className="flex gap-2">{actions}</div>}
        </header>
    );
}

/** Standard page frame for a tool: content width and gutters. */
export function ToolPage({ children }: { children: React.ReactNode }) {
    return <main className="w-full max-w-295 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 xl:px-10">{children}</main>;
}
