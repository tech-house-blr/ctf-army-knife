import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the Python API (apps/api). The browser calls /api/...,
 * and this forwards to API_URL, which is read per request rather than baked in
 * at build time, so one web image works in any deployment.
 *
 * Handles uploads (multipart bodies pass through unchanged, with a size cap)
 * and streams responses back as they arrive, so file downloads and
 * progressive results (NDJSON / Server-Sent Events) work.
 */
export const dynamic = "force-dynamic";

const MiB = 1024 * 1024;
const TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 120_000);
// Slightly above the API's 25 MiB file limit to leave room for multipart framing;
// the API enforces the exact per-file limit.
const MAX_BODY_BYTES = Number(process.env.API_MAX_BODY_BYTES ?? 26 * MiB);
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"];

class BodyTooLarge extends Error {}

function apiBase(): string {
    return (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
}

/** Read the request body, stopping as soon as it exceeds the limit (Content-Length may be absent or wrong). */
async function readBody(request: NextRequest): Promise<Uint8Array<ArrayBuffer> | undefined> {
    if (!request.body) return undefined;
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new BodyTooLarge();
        }
        chunks.push(value);
    }
    const body = new Uint8Array(new ArrayBuffer(size));
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return body;
}

const tooLarge = () =>
    Response.json({ detail: `Request is larger than ${Math.floor(MAX_BODY_BYTES / MiB)} MiB.` }, { status: 413 });

async function forward(request: NextRequest, { params }: RouteContext<"/api/[...path]">): Promise<Response> {
    const { path } = await params;
    const target = `${apiBase()}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) return tooLarge();

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType); // includes the multipart boundary
    const accept = request.headers.get("accept");
    if (accept) headers.set("accept", accept);

    try {
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: request.method === "GET" ? undefined : await readBody(request),
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        const responseHeaders = new Headers();
        for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name);
            if (value) responseHeaders.set(name, value);
        }
        if (!responseHeaders.has("content-type")) responseHeaders.set("content-type", "application/json");
        return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch (error) {
        if (error instanceof BodyTooLarge) return tooLarge();
        const timedOut = error instanceof DOMException && error.name === "TimeoutError";
        return Response.json(
            { detail: timedOut ? "The API took too long to respond." : "The API is unreachable. Is apps/api running?" },
            { status: timedOut ? 504 : 502 },
        );
    }
}

export { forward as GET, forward as POST };
