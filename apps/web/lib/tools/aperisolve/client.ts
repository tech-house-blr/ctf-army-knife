/** Client for the AperiSolve API (apps/api/ctf_api/tools/aperisolve/router.py). */

/** Used until /api/aperisolve/config answers; matches the API's default. */
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const INCOMPLETE_ANALYSIS =
    "The analysis stopped before every tool finished (the connection was lost or timed out). Try again.";

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

/** Pass events through, and fail if the stream ends without its final "done" event. */
export async function* untilDone(events: AsyncIterable<AnalysisEvent>): AsyncGenerator<AnalysisEvent> {
    for await (const event of events) {
        yield event;
        if (event.event === "done") return;
    }
    throw new Error(INCOMPLETE_ANALYSIS);
}

/** The API's upload limit, or null if it can't be fetched. */
export async function fetchUploadLimit(signal?: AbortSignal): Promise<number | null> {
    try {
        const response = await fetch("/api/aperisolve/config", { signal });
        if (!response.ok) return null;
        const { max_upload_bytes: limit } = await response.json();
        return Number.isFinite(limit) && limit > 0 ? limit : null;
    } catch {
        return null;
    }
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
    yield* untilDone(readEvents(response.body));
}
