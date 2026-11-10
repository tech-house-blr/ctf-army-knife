import Link from "next/link";
import Icon from "@/components/icons";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

export const metadata = { title: "Not found" };

export default function NotFound() {
    const tools = toolsByCategory().flatMap((group) => group.tools);
    return (
        <main className="w-full max-w-295 px-4 pt-16 pb-16 sm:px-6 sm:pt-24 xl:px-10">
            <p className="font-mono text-sm text-signal">404</p>
            <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">Nothing here</h1>
            <p className="mt-4 max-w-[48ch] text-fg-2">This page doesn&rsquo;t exist or has moved. Pick a tool instead.</p>

            <ul className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                {tools.map((tool) => (
                    <li key={tool.slug}>
                        <Link
                            href={toolHref(tool)}
                            className="panel group flex h-full items-center gap-3 p-3 no-underline transition-colors duration-100 hover:border-line-strong hover:bg-raised"
                        >
                            <Icon name={tool.icon} className="size-[18px] shrink-0 text-fg-2 group-hover:text-signal" />
                            <span className="truncate text-sm font-medium text-fg">{tool.name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <Link href="/" className="btn btn-primary mt-8">
                Back to all tools
            </Link>
        </main>
    );
}
