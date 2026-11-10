// Tech House BLR logo, traced pixel-for-pixel from the brand PNGs
// (Tech House/Logos/2.png and 3.png): same blocks, same colours.
// Brand assets are CC BY-NC-ND 4.0 and belong to Tech House BLR; they are not
// covered by this repository's code licence. Do not change the geometry or colours.

/** The logo's own green. The interface accent is a calmer tone of it (--signal). */
export const TECH_HOUSE_GREEN = "#00ff2a";

type Part = "roof" | "h" | "t";
const MARK: readonly [number, number, number, number, Part][] = [
    [123, 0, 61, 61, "roof"],
    [61, 62, 61, 61, "roof"],
    [184, 62, 61, 61, "roof"],
    [74, 135, 169, 37, "t"],
    [0, 123, 61, 61, "roof"],
    [245, 123, 61, 61, "roof"],
    [131, 172, 56, 87, "t"],
    [76, 184, 40, 75, "h"],
    [202, 184, 40, 75, "h"],
    [76, 259, 166, 34, "h"],
    [131, 293, 56, 50, "t"],
    [76, 293, 40, 83, "h"],
    [202, 293, 40, 83, "h"],
];

type Tile = "ink" | "blr";
// Wordmark tiles: 23 px squares at their exact traced positions: [x, y, tile].
const WORDMARK: readonly [number, number, Tile][] = [
 [25, 0, "ink"], [389, 0, "ink"], [536, 0, "ink"], [1295, 0, "blr"], [1442, 0, "blr"], [25, 26, "ink"], [389, 26, "ink"], [536, 26, "ink"], [1295, 26, "blr"], [1442, 26, "blr"], [0, 51, "ink"], [25, 51, "ink"], [51, 51, "ink"], [121, 51, "ink"], [147, 51, "ink"], [172, 51, "ink"], [198, 51, "ink"], [268, 51, "ink"], [293, 51, "ink"], [319, 51, "ink"], [344, 51, "ink"], [389, 51, "ink"], [414, 51, "ink"], [440, 51, "ink"], [466, 51, "ink"], [536, 51, "ink"], [561, 51, "ink"], [587, 51, "ink"], [613, 51, "ink"], [708, 51, "ink"], [734, 51, "ink"], [759, 51, "ink"], [829, 51, "ink"], [932, 51, "ink"], [1027, 51, "ink"], [1053, 51, "ink"], [1078, 51, "ink"], [1104, 51, "ink"], [1174, 51, "ink"], [1200, 51, "ink"], [1225, 51, "ink"], [1251, 51, "ink"], [1295, 51, "blr"], [1321, 51, "blr"], [1346, 51, "blr"], [1372, 51, "blr"], [1442, 51, "blr"], [1487, 51, "blr"], [1512, 51, "blr"], [1538, 51, "blr"], [1563, 51, "blr"], [95, 77, "ink"], [829, 77, "ink"], [1027, 77, "ink"], [1397, 77, "blr"], [25, 77, "ink"], [172, 77, "ink"], [242, 77, "ink"], [389, 77, "ink"], [491, 77, "ink"], [536, 77, "ink"], [638, 77, "ink"], [683, 77, "ink"], [785, 77, "ink"], [932, 77, "ink"], [1002, 77, "ink"], [1149, 77, "ink"], [1225, 77, "ink"], [1295, 77, "blr"], [1442, 77, "blr"], [1487, 77, "blr"], [1589, 77, "blr"], [25, 102, "ink"], [147, 102, "ink"], [242, 102, "ink"], [389, 102, "ink"], [491, 102, "ink"], [536, 102, "ink"], [638, 102, "ink"], [683, 102, "ink"], [785, 102, "ink"], [932, 102, "ink"], [1053, 102, "ink"], [1078, 102, "ink"], [1149, 102, "ink"], [1200, 102, "ink"], [1295, 102, "blr"], [1442, 102, "blr"], [1487, 102, "blr"], [95, 102, "ink"], [829, 102, "ink"], [1397, 102, "blr"], [25, 128, "ink"], [95, 128, "ink"], [121, 128, "ink"], [147, 128, "ink"], [172, 128, "ink"], [198, 128, "ink"], [268, 128, "ink"], [293, 128, "ink"], [319, 128, "ink"], [344, 128, "ink"], [389, 128, "ink"], [491, 128, "ink"], [536, 128, "ink"], [638, 128, "ink"], [708, 128, "ink"], [734, 128, "ink"], [759, 128, "ink"], [855, 128, "ink"], [881, 128, "ink"], [906, 128, "ink"], [976, 128, "ink"], [1002, 128, "ink"], [1027, 128, "ink"], [1053, 128, "ink"], [1149, 128, "ink"], [1174, 128, "ink"], [1200, 128, "ink"], [1225, 128, "ink"], [1251, 128, "ink"], [1295, 128, "blr"], [1321, 128, "blr"], [1346, 128, "blr"], [1372, 128, "blr"], [1442, 128, "blr"], [1487, 128, "blr"],
];

const markFill: Record<Part, string> = { roof: "var(--brand-roof)", h: "#545454", t: TECH_HOUSE_GREEN };

/** The pixel house mark: roof, green T, grey H. */
export function TechHouseMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 307 376" className={className} aria-hidden="true" shapeRendering="crispEdges">
            {MARK.map(([x, y, w, h, part]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={markFill[part]} />)}
        </svg>
    );
}

/** The "techhouseblr" pixel wordmark. */
export function TechHouseWordmark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 1612 151" className={className} aria-hidden="true" shapeRendering="crispEdges">
            {WORDMARK.map(([x, y, tile]) => (
                <rect
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    width={23}
                    height={23}
                    fill={tile === "blr" ? TECH_HOUSE_GREEN : "var(--brand-ink)"}
                />
            ))}
        </svg>
    );
}
