/** Client for the AperiSolve API (apps/api/ctf_api/tools/aperisolve/router.py). */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type AnalyzerResult = {
    status: "ok" | "error" | "unavailable";
    output?: string | string[] | Record<string, string>;
    images?: Record<string, string[]>;
    download?: string;
    note?: string;
    error?: string;
};

export type FileInfo = { name: string; size: number; mime: string; kind: string; tags: string[] };

export type AnalysisEvent =
    | { event: "start"; id: string; file: FileInfo; analyzers: { name: string; order: number; available: boolean }[] }
    | { event: "result"; analyzer: string; result: AnalyzerResult; duration_ms: number }
    | { event: "done"; duration_ms: number };

/** Display names and one-line explanations, keyed by analyzer name. */
export const ANALYZER_INFO: Record<string, { label: string; description: string }> = {
    decomposer: { label: "Bit planes", description: "Every bit of every colour channel as its own image. LSB stego shows up in bit 0." },
    color_remapping: { label: "Colour remapping", description: "Random palettes that make near-identical colours stand apart." },
    file: { label: "file", description: "What the file really is, by its content." },
    exiftool: { label: "ExifTool", description: "Metadata: comments, camera fields, embedded thumbnails." },
    binwalk: { label: "binwalk", description: "Finds and extracts files embedded inside this one." },
    foremost: { label: "foremost", description: "Carves files out by their headers and footers." },
    outguess: { label: "OutGuess", description: "Extracts OutGuess-hidden data from JPEGs (deep analysis)." },
    pngcheck: { label: "pngcheck", description: "Validates PNG chunks and reports anything unusual." },
    pcrt: { label: "PNG repair", description: "Fixes broken headers, CRCs and dimensions; finds data after IEND." },
    identify: { label: "identify", description: "Detailed image properties from GraphicsMagick." },
    steghide: { label: "steghide", description: "Extracts steghide data from JPEG/BMP/WAV/AU. Uses the password if given." },
    zsteg: { label: "zsteg", description: "Tries LSB/MSB bit orders and channels on PNG/BMP for hidden data." },
    strings: { label: "strings", description: "Printable text inside the file (5+ characters)." },
};

/** Split a byte stream into parsed NDJSON events, buffering partial lines across chunks. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AnalysisEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) yield JSON.parse(line) as AnalysisEvent;
        }
        if (done) break;
    }
    if (buffer.trim()) yield JSON.parse(buffer) as AnalysisEvent;
}

/** Turn a FastAPI / proxy error body into a readable message. */
export async function errorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if (typeof body.detail === "string") return body.detail;
        if (Array.isArray(body.detail)) return body.detail.map((item: { msg?: string }) => item.msg).join("; ");
    } catch {
        /* not JSON */
    }
    return `The analysis failed (HTTP ${response.status}).`;
}

export async function* analyze(
    file: File,
    options: { password: string; deep: boolean; signal?: AbortSignal },
): AsyncGenerator<AnalysisEvent> {
    const form = new FormData();
    form.append("file", file);
    form.append("password", options.password);
    form.append("deep", String(options.deep));
    const response = await fetch("/api/aperisolve/analyze", { method: "POST", body: form, signal: options.signal });
    if (!response.ok || !response.body) throw new Error(await errorMessage(response));
    yield* readEvents(response.body);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
