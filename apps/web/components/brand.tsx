/* eslint-disable @next/next/no-img-element -- fixed-size brand images with hand-made 1x/2x files */

// Tech House BLR logo: the original brand image (from the Tech House website),
// trimmed, exported at each display size at 1x and 2x, and cut at the gap
// between mark and wordmark so the wordmark can fold away (public/brand). The
// artwork is made for dark backgrounds, so the light theme shows it on its
// native black backing rather than altering it.
// Brand assets are CC BY-NC-ND 4.0 and belong to Tech House BLR; they are not
// covered by this repository's code licence.

/** The logo's own green. The interface accent is a calmer tone of it (--signal). */
export const TECH_HOUSE_GREEN = "#00ff2a";

const SIZES = {
    sm: { height: 24, mark: 20, wordmark: 161 },
    md: { height: 36, mark: 30, wordmark: 242 },
} as const;

type Size = keyof typeof SIZES;

function Img({ name, size, width }: { name: string; size: Size; width: number }) {
    const base = `/brand/techhouse-${name}-${SIZES[size].height}`;
    return (
        <img
            src={`${base}.png`}
            srcSet={`${base}.png 1x, ${base}@2x.png 2x`}
            width={width}
            height={SIZES[size].height}
            alt=""
            draggable={false}
            className="block max-w-none"
        />
    );
}

/**
 * The full Tech House logo. `wordmarkClassName` can fold the wordmark away
 * (e.g. in the collapsed rail): it animates max-width and opacity, leaving the mark.
 */
export function TechHouseLogo({ size = "sm", className = "", wordmarkClassName = "" }: { size?: Size; className?: string; wordmarkClassName?: string }) {
    const { mark, wordmark } = SIZES[size];
    return (
        <span className={`inline-flex shrink-0 overflow-hidden rounded-md py-1 pr-2 pl-2 in-data-[theme=light]:bg-black ${className}`}>
            <Img name="lockmark" size={size} width={mark} />
            <span
                style={{ "--wordmark-w": `${wordmark}px` } as React.CSSProperties}
                className={`block max-w-(--wordmark-w) overflow-hidden transition-[max-width,opacity] duration-(--rail-dur) ease-(--ease-liquid) ${wordmarkClassName}`}
            >
                <Img name="wordmark" size={size} width={wordmark} />
            </span>
        </span>
    );
}
