import Link from "next/link";
import { TechHouseLogo } from "@/components/brand";
import Icon from "@/components/icons";
import SmartInput from "@/components/smart-input";
import { LINKS } from "@/lib/links";
import { toolHref, toolsByCategory } from "@/lib/tools/registry";

export default function Home() {
    const tools = toolsByCategory().flatMap((group) => group.tools);
    return (
        <main className="w-full max-w-295 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 xl:px-10">
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="flex items-center gap-4">
                    {/* PixelLab pixel art, shown at whole-number scales only (32 px, 64 px) to stay sharp. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size pixel art */}
                    <img
                        src="/brand/army-knife-64.png"
                        srcSet="/brand/army-knife-64.png 1x, /brand/army-knife-128.png 2x"
                        width={64}
                        height={64}
                        alt=""
                        className="size-8 shrink-0 [image-rendering:pixelated] sm:size-16"
                    />
                    <h1 className="font-display text-4xl leading-none sm:text-5xl">CTF Army Knife</h1>
                </div>
                <a
                    href={LINKS.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Tech House BLR website"
                    className="flex items-end gap-3 rounded-md p-1 opacity-90 no-underline transition-opacity duration-100 hover:opacity-100"
                >
                    <TechHouseLogo size="md" wordmarkClassName="max-[359px]:max-w-0 max-[359px]:opacity-0" />
                </a>
            </header>

            <div className="mt-8">
                <SmartInput />
            </div>

            <nav aria-label="All tools" className="mt-6">
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {tools.map((tool) => (
                        <li key={tool.slug}>
                            <Link
                                href={toolHref(tool)}
                                className="panel group flex h-full min-h-24 flex-col justify-between gap-4 p-4 no-underline transition-colors duration-100 hover:border-line-strong hover:bg-raised"
                            >
                                <span className="grid size-9 place-items-center rounded-lg border border-line bg-inset text-fg-2 transition-colors duration-100 group-hover:border-signal/40 group-hover:text-signal">
                                    <Icon name={tool.icon} />
                                </span>
                                <span className="font-medium text-fg">{tool.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </main>
    );
}
