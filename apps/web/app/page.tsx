import Link from "next/link";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

export default function Home() {
    const groups = toolsByCategory();
    return (
        <main className="w-full max-w-[1180px] px-4 pt-6 pb-16 sm:px-6 sm:pt-8 xl:px-10">
            <h1 className="flex min-h-10 items-center text-xl font-semibold tracking-tight">CTF Army Knife</h1>
            <div className="panel mt-6 grid gap-px overflow-hidden bg-line md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": groups.length } as React.CSSProperties}>
                {groups.map((group) => (
                    <section key={group.id} aria-labelledby={`cat-${group.id}`} className="bg-panel p-5">
                        <h2 id={`cat-${group.id}`} className="text-xs font-medium text-fg-3">{group.label}</h2>
                        <ul className="mt-3 flex flex-col gap-1">
                            {group.tools.map((tool) => (
                                <li key={tool.slug}>
                                    <Link
                                        href={toolHref(tool)}
                                        className="-mx-2 flex min-h-10 items-center rounded-md px-2 text-[1.0667rem] font-medium text-fg no-underline transition-colors duration-100 hover:bg-raised"
                                    >
                                        {tool.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </main>
    );
}
