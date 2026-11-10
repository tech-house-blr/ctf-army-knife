import Link from "next/link";
import { TechHouseMark, TechHouseWordmark } from "@/components/brand";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

const TECH_HOUSE_URL = "https://github.com/tech-house-blr";

export default function Home() {
    const groups = toolsByCategory();
    return (
        <main className="w-full max-w-295 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 xl:px-10">
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <h1 className="font-display text-4xl leading-none sm:text-5xl">CTF Army Knife</h1>
                <a
                    href={TECH_HOUSE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Tech House BLR on GitHub"
                    className="flex items-end gap-3 rounded-md p-1 opacity-90 no-underline transition-opacity duration-100 hover:opacity-100"
                >
                    <TechHouseMark size="md" />
                    <TechHouseWordmark size="md" className="max-[359px]:hidden" />
                </a>
            </header>
            <div className="panel mt-8 grid gap-px overflow-hidden bg-line md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": groups.length } as React.CSSProperties}>
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
