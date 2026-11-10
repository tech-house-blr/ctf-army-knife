import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the Python API (apps/api). The browser calls /api/...,
 * and this forwards to API_URL, which is read per request rather than baked in
 * at build time, so one web image works in any deployment.
 */
export const dynamic = "force-dynamic";

const TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 120_000);

function apiBase(): string {
    return (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
}

async function forward(request: NextRequest, { params }: RouteContext<"/api/[...path]">): Promise<Response> {
    const { path } = await params;
    const target = `${apiBase()}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    try {
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: request.method === "GET" ? undefined : await request.arrayBuffer(),
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        return new Response(upstream.body, {
            status: upstream.status,
            headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
        });
    } catch (error) {
        const timedOut = error instanceof DOMException && error.name === "TimeoutError";
        return Response.json(
            { detail: timedOut ? "The API took too long to respond." : "The API is unreachable. Is apps/api running?" },
            { status: timedOut ? 504 : 502 },
        );
    }
}

export { forward as GET, forward as POST };
