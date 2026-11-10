import Link from "next/link";
import { runsWhere, toolHref, toolsByCategory, tools } from "@/lib/tools/registry";

export default function Home() {
    return (
        <main className="w-full max-w-[1120px] px-4 pt-10 pb-24 sm:px-8 sm:pt-16 xl:px-12">
            <header className="border-b-[3px] border-ink pb-8">
                <h1 className="display text-[clamp(3.25rem,11vw,9rem)]">
                    CTF Army{" "}
                    <br />
                    Knife
                </h1>
                <p className="mt-6 max-w-[52ch] text-lg leading-snug">
                    {tools.length} tools for capture-the-flag challenges. Self-hosted: what you paste or upload stays on
                    this server or in your browser.
                </p>
            </header>

            {toolsByCategory().map((group) => (
                <section key={group.id} aria-labelledby={`cat-${group.id}`} className="mt-12">
                    <h2 id={`cat-${group.id}`} className="border-b-2 border-ink pb-2 text-xl font-extrabold">
                        {group.label}
                    </h2>
                    <ul>
                        {group.tools.map((tool) => (
                            <li key={tool.slug} className="border-b border-ink">
                                <Link
                                    href={toolHref(tool)}
                                    className="group grid gap-x-8 gap-y-1 px-2 py-5 no-underline transition-colors duration-100 hover:bg-ink hover:text-paper sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-baseline"
                                >
                                    <span className="text-2xl font-bold leading-tight tracking-tight">{tool.name}</span>
                                    <span className="max-w-[58ch] text-ink-2 group-hover:text-paper">{tool.description}</span>
                                    <span className="text-sm text-ink-2 group-hover:text-paper">{runsWhere(tool)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </main>
    );
}
