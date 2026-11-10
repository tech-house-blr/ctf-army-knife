// Tech House BLR logo, traced from the brand PNGs (Tech House/Logos/2.png
// and 3.png) and rendered as pixel art: each size is a fixed rendition whose
// blocks land on whole CSS pixels, so it stays sharp at 1x and 2x instead of
// blurring when scaled. Same blocks and colours as the brand files; the thin
// gaps between wordmark tiles are 1 px at the larger size and round away at the smaller.
// Brand assets are CC BY-NC-ND 4.0 and belong to Tech House BLR; they are not
// covered by this repository's code licence. Generated; do not edit by hand.

/** The logo's own green. The interface accent is a calmer tone of it (--signal). */
export const TECH_HOUSE_GREEN = "#00ff2a";

type Part = "roof" | "h" | "t";
type Tile = "ink" | "blr";
type Rendition = {
    mark: { width: number; height: number; rects: [number, number, number, number, Part][] };
    wordmark: { width: number; height: number; tile: number; cells: [number, number, Tile][] };
};

const RENDITIONS: Record<"sm" | "md", Rendition> = {
    sm: {
        mark: { width: 20, height: 25, rects: [[8, 0, 4, 4, "roof"], [4, 4, 4, 4, "roof"], [12, 4, 4, 4, "roof"], [5, 9, 11, 2, "t"], [0, 8, 4, 4, "roof"], [16, 8, 4, 4, "roof"], [9, 11, 3, 6, "t"], [5, 12, 3, 5, "h"], [13, 12, 3, 5, "h"], [5, 17, 11, 2, "h"], [9, 19, 3, 3, "t"], [5, 19, 3, 6, "h"], [13, 19, 3, 6, "h"]] },
        wordmark: { width: 187, height: 18, tile: 3, cells: [[3, 0, "ink"], [45, 0, "ink"], [62, 0, "ink"], [150, 0, "blr"], [167, 0, "blr"], [3, 3, "ink"], [45, 3, "ink"], [62, 3, "ink"], [150, 3, "blr"], [167, 3, "blr"], [0, 6, "ink"], [3, 6, "ink"], [6, 6, "ink"], [14, 6, "ink"], [17, 6, "ink"], [20, 6, "ink"], [23, 6, "ink"], [31, 6, "ink"], [34, 6, "ink"], [37, 6, "ink"], [40, 6, "ink"], [45, 6, "ink"], [48, 6, "ink"], [51, 6, "ink"], [54, 6, "ink"], [62, 6, "ink"], [65, 6, "ink"], [68, 6, "ink"], [71, 6, "ink"], [82, 6, "ink"], [85, 6, "ink"], [88, 6, "ink"], [96, 6, "ink"], [108, 6, "ink"], [119, 6, "ink"], [122, 6, "ink"], [125, 6, "ink"], [128, 6, "ink"], [136, 6, "ink"], [139, 6, "ink"], [142, 6, "ink"], [145, 6, "ink"], [150, 6, "blr"], [153, 6, "blr"], [156, 6, "blr"], [159, 6, "blr"], [167, 6, "blr"], [172, 6, "blr"], [175, 6, "blr"], [178, 6, "blr"], [181, 6, "blr"], [11, 9, "ink"], [96, 9, "ink"], [119, 9, "ink"], [162, 9, "blr"], [3, 9, "ink"], [20, 9, "ink"], [28, 9, "ink"], [45, 9, "ink"], [57, 9, "ink"], [62, 9, "ink"], [74, 9, "ink"], [79, 9, "ink"], [91, 9, "ink"], [108, 9, "ink"], [116, 9, "ink"], [133, 9, "ink"], [142, 9, "ink"], [150, 9, "blr"], [167, 9, "blr"], [172, 9, "blr"], [184, 9, "blr"], [3, 12, "ink"], [17, 12, "ink"], [28, 12, "ink"], [45, 12, "ink"], [57, 12, "ink"], [62, 12, "ink"], [74, 12, "ink"], [79, 12, "ink"], [91, 12, "ink"], [108, 12, "ink"], [122, 12, "ink"], [125, 12, "ink"], [133, 12, "ink"], [139, 12, "ink"], [150, 12, "blr"], [167, 12, "blr"], [172, 12, "blr"], [11, 12, "ink"], [96, 12, "ink"], [162, 12, "blr"], [3, 15, "ink"], [11, 15, "ink"], [14, 15, "ink"], [17, 15, "ink"], [20, 15, "ink"], [23, 15, "ink"], [31, 15, "ink"], [34, 15, "ink"], [37, 15, "ink"], [40, 15, "ink"], [45, 15, "ink"], [57, 15, "ink"], [62, 15, "ink"], [74, 15, "ink"], [82, 15, "ink"], [85, 15, "ink"], [88, 15, "ink"], [99, 15, "ink"], [102, 15, "ink"], [105, 15, "ink"], [113, 15, "ink"], [116, 15, "ink"], [119, 15, "ink"], [122, 15, "ink"], [133, 15, "ink"], [136, 15, "ink"], [139, 15, "ink"], [142, 15, "ink"], [145, 15, "ink"], [150, 15, "blr"], [153, 15, "blr"], [156, 15, "blr"], [159, 15, "blr"], [167, 15, "blr"], [172, 15, "blr"]] },
    },
    md: {
        mark: { width: 30, height: 37, rects: [[12, 0, 6, 6, "roof"], [6, 6, 6, 6, "roof"], [18, 6, 6, 6, "roof"], [7, 13, 17, 4, "t"], [0, 12, 6, 6, "roof"], [24, 12, 6, 6, "roof"], [13, 17, 5, 8, "t"], [7, 18, 4, 7, "h"], [20, 18, 4, 7, "h"], [7, 25, 17, 4, "h"], [13, 29, 5, 5, "t"], [7, 29, 4, 8, "h"], [20, 29, 4, 8, "h"]] },
        wordmark: { width: 252, height: 23, tile: 3, cells: [[4, 0, "ink"], [61, 0, "ink"], [84, 0, "ink"], [203, 0, "blr"], [226, 0, "blr"], [4, 4, "ink"], [61, 4, "ink"], [84, 4, "ink"], [203, 4, "blr"], [226, 4, "blr"], [0, 8, "ink"], [4, 8, "ink"], [8, 8, "ink"], [19, 8, "ink"], [23, 8, "ink"], [27, 8, "ink"], [31, 8, "ink"], [42, 8, "ink"], [46, 8, "ink"], [50, 8, "ink"], [54, 8, "ink"], [61, 8, "ink"], [65, 8, "ink"], [69, 8, "ink"], [73, 8, "ink"], [84, 8, "ink"], [88, 8, "ink"], [92, 8, "ink"], [96, 8, "ink"], [111, 8, "ink"], [115, 8, "ink"], [119, 8, "ink"], [130, 8, "ink"], [146, 8, "ink"], [161, 8, "ink"], [165, 8, "ink"], [169, 8, "ink"], [173, 8, "ink"], [184, 8, "ink"], [188, 8, "ink"], [192, 8, "ink"], [196, 8, "ink"], [203, 8, "blr"], [207, 8, "blr"], [211, 8, "blr"], [215, 8, "blr"], [226, 8, "blr"], [233, 8, "blr"], [237, 8, "blr"], [241, 8, "blr"], [245, 8, "blr"], [15, 12, "ink"], [130, 12, "ink"], [161, 12, "ink"], [219, 12, "blr"], [4, 12, "ink"], [27, 12, "ink"], [38, 12, "ink"], [61, 12, "ink"], [77, 12, "ink"], [84, 12, "ink"], [100, 12, "ink"], [107, 12, "ink"], [123, 12, "ink"], [146, 12, "ink"], [157, 12, "ink"], [180, 12, "ink"], [192, 12, "ink"], [203, 12, "blr"], [226, 12, "blr"], [233, 12, "blr"], [249, 12, "blr"], [4, 16, "ink"], [23, 16, "ink"], [38, 16, "ink"], [61, 16, "ink"], [77, 16, "ink"], [84, 16, "ink"], [100, 16, "ink"], [107, 16, "ink"], [123, 16, "ink"], [146, 16, "ink"], [165, 16, "ink"], [169, 16, "ink"], [180, 16, "ink"], [188, 16, "ink"], [203, 16, "blr"], [226, 16, "blr"], [233, 16, "blr"], [15, 16, "ink"], [130, 16, "ink"], [219, 16, "blr"], [4, 20, "ink"], [15, 20, "ink"], [19, 20, "ink"], [23, 20, "ink"], [27, 20, "ink"], [31, 20, "ink"], [42, 20, "ink"], [46, 20, "ink"], [50, 20, "ink"], [54, 20, "ink"], [61, 20, "ink"], [77, 20, "ink"], [84, 20, "ink"], [100, 20, "ink"], [111, 20, "ink"], [115, 20, "ink"], [119, 20, "ink"], [134, 20, "ink"], [138, 20, "ink"], [142, 20, "ink"], [153, 20, "ink"], [157, 20, "ink"], [161, 20, "ink"], [165, 20, "ink"], [180, 20, "ink"], [184, 20, "ink"], [188, 20, "ink"], [192, 20, "ink"], [196, 20, "ink"], [203, 20, "blr"], [207, 20, "blr"], [211, 20, "blr"], [215, 20, "blr"], [226, 20, "blr"], [233, 20, "blr"]] },
    },
};

const markFill: Record<Part, string> = { roof: "var(--brand-roof)", h: "#545454", t: TECH_HOUSE_GREEN };

/** The pixel house mark: roof, green T, grey H. */
export function TechHouseMark({ size = "sm", className }: { size?: keyof typeof RENDITIONS; className?: string }) {
    const { width, height, rects } = RENDITIONS[size].mark;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
            {rects.map(([x, y, w, h, part]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={markFill[part]} />)}
        </svg>
    );
}

/** The "techhouseblr" pixel wordmark. */
export function TechHouseWordmark({ size = "sm", className }: { size?: keyof typeof RENDITIONS; className?: string }) {
    const { width, height, tile, cells } = RENDITIONS[size].wordmark;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
            {cells.map(([x, y, kind]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={tile} height={tile} fill={kind === "blr" ? TECH_HOUSE_GREEN : "var(--brand-ink)"} />
            ))}
        </svg>
    );
}
