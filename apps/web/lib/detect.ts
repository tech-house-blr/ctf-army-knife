/**
 * Guess which tool fits a pasted text or a dropped file, for the home page's
 * smart input. Pure and synchronous so it can run on every keystroke.
 */

export type ToolSlug = "gpg-decoder" | "cryptogram-solver" | "cyberchef" | "aperisolve";

export type Detection = {
    /** Short, plain description of what the input looks like. */
    label: string;
    /** Best tool first, then the other tools that can take this input. */
    tools: ToolSlug[];
};

const PGP_ARMOR = /-----BEGIN PGP [A-Z ]+-----/;
const HEX = /^(?:[0-9a-f]{2}[\s:,-]*)+$/i;
const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;

export function detectText(input: string): Detection | null {
    const text = input.trim();
    if (!text) return null;

    if (PGP_ARMOR.test(text)) {
        return { label: "OpenPGP data", tools: ["gpg-decoder", "cyberchef"] };
    }

    const compact = text.replace(/\s+/g, "");
    if (compact.length >= 4 && HEX.test(text)) {
        return { label: "Hex bytes", tools: ["cyberchef"] };
    }
    if (compact.length >= 8 && BASE64.test(compact) && !/\s/.test(text.replace(/\n/g, ""))) {
        return { label: "Encoded data, possibly Base64", tools: ["cyberchef"] };
    }

    // Words made almost entirely of letters: a substitution cipher (or plain text).
    const letters = (text.match(/[A-Za-z]/g) ?? []).length;
    const visible = compact.length;
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words >= 3 && letters / visible >= 0.85) {
        return { label: "Letters only, like a substitution cipher", tools: ["cryptogram-solver", "cyberchef"] };
    }

    return { label: "Text", tools: ["cyberchef", "cryptogram-solver"] };
}

export function detectFile(file: File): Detection {
    const kind = file.type.split("/")[0];
    if (kind === "image") return { label: "Image file", tools: ["aperisolve"] };
    if (kind === "audio") return { label: "Audio file", tools: ["aperisolve"] };
    return { label: "File", tools: ["aperisolve"] };
}

/**
 * CyberChef workspace link that opens `text` as input with the Magic recipe,
 * which tries common decodings and shows the ones that produce readable output.
 */
export function cyberChefLink(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const input = encodeURIComponent(btoa(binary));
    return `/cyberchef#recipe=Magic(3,false,false,'')&input=${input}&ienc=65001&oenc=65001`;
}
