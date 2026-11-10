import { runsWhere, toolBySlug } from "@/lib/tools/registry";

/** A tool page's title block: the name set large, one line on what it does, and where it runs. */
export default function PageHeader({ slug, lede }: { slug: string; lede?: string }) {
    const tool = toolBySlug(slug);
    if (!tool) throw new Error(`Unknown tool: ${slug}`);
    return (
        <header className="border-b-[3px] border-ink pb-6">
            <h1 className="display text-[clamp(2.5rem,7vw,5.5rem)]">{tool.name}</h1>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                <p className="max-w-[60ch] text-lg leading-snug">{lede ?? tool.description}</p>
                <p className="shrink-0 text-sm text-ink-2">{runsWhere(tool)}</p>
            </div>
        </header>
    );
}

/** Standard page frame for a tool: content width and gutters. */
export function ToolPage({ children }: { children: React.ReactNode }) {
    return <main className="w-full max-w-[1120px] px-4 pt-8 pb-20 sm:px-8 sm:pt-12 xl:px-12">{children}</main>;
}
