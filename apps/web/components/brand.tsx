/* eslint-disable @next/next/no-img-element -- fixed-size brand images with hand-made 1x/2x files */

// Tech House BLR logo: the original brand images (from the Tech House website),
// trimmed and exported at each display size at 1x and 2x (public/brand). The
// artwork is made for dark backgrounds, so the light theme shows it on its
// native black backing rather than altering it.
// Brand assets are CC BY-NC-ND 4.0 and belong to Tech House BLR; they are not
// covered by this repository's code licence.

/** The logo's own green. The interface accent is a calmer tone of it (--signal). */
export const TECH_HOUSE_GREEN = "#00ff2a";

const SIZES = {
    sm: { height: 24, lockup: 181, mark: 20 },
    md: { height: 36, lockup: 272, mark: 29 },
} as const;

type Props = { size?: keyof typeof SIZES; className?: string };

function BrandImage({ kind, size = "sm", className = "" }: Props & { kind: "lockup" | "mark" }) {
    const { height, [kind]: width } = SIZES[size];
    const base = `/brand/techhouse-${kind}-${height}`;
    return (
        <span
            className={`inline-flex shrink-0 rounded-md in-data-[theme=light]:bg-black ${
                kind === "mark" ? "p-1" : "px-2 py-1"
            } ${className}`}
        >
            <img src={`${base}.png`} srcSet={`${base}.png 1x, ${base}@2x.png 2x`} width={width} height={height} alt="" draggable={false} />
        </span>
    );
}

/** The full Tech House logo: mark and "techhouseblr" wordmark. */
export function TechHouseLogo(props: Props) {
    return <BrandImage kind="lockup" {...props} />;
}

/** The Tech House mark alone. */
export function TechHouseMark(props: Props) {
    return <BrandImage kind="mark" {...props} />;
}
