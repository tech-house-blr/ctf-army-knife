import Link from "next/link";
import ToolIcon from "@/components/tool-icon";
import { toolHref, tools } from "@/lib/tools/registry";

export default function Home() {
    return (
        <>
            <h1 className="text-center text-3xl mt-5 text-amber-300">
                CTF Army Knife
            </h1>

            <main className="mx-auto mt-10 grid w-full max-w-4xl gap-4 px-4 sm:grid-cols-2">
                {tools.map((tool) => (
                    <Link
                        key={tool.slug}
                        href={toolHref(tool)}
                        className="rounded border border-amber-300/30 p-4 text-amber-300 hover:border-amber-300"
                    >
                        <span className="flex items-center gap-2 text-xl">
                            <ToolIcon name={tool.icon} />
                            {tool.name}
                            {tool.status === "planned" && <small className="ml-auto text-xs opacity-70">planned</small>}
                        </span>
                        <p className="mt-2 text-sm text-stone-300">{tool.description}</p>
                    </Link>
                ))}
            </main>
        </>
    );
}
