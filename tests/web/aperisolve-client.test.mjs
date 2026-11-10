import test from "node:test";
import assert from "node:assert/strict";
import { readEvents, errorMessage, untilDone, ANALYZER_INFO, INCOMPLETE_ANALYSIS } from "../../apps/web/lib/tools/aperisolve/client.ts";
import { formatBytes } from "../../apps/web/lib/format.ts";

const streamOf = (...chunks) => new ReadableStream({
    start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
    },
});

test("NDJSON events are parsed even when lines are split across chunks", async () => {
    const events = [];
    for await (const event of readEvents(streamOf('{"event":"st', 'art","id":"x"}\n{"event":"result","analyzer":"file"', ',"result":{"status":"ok"}}\n\n{"event":"done","duration_ms":5}'))) {
        events.push(event);
    }
    assert.deepEqual(events.map((e) => e.event), ["start", "result", "done"]);
    assert.equal(events[1].analyzer, "file");
});

test("multi-byte characters split across chunks decode correctly", async () => {
    const bytes = new TextEncoder().encode('{"event":"done","note":"résumé ✓"}\n');
    const events = [];
    const stream = new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, 22)); c.enqueue(bytes.slice(22)); c.close(); } });
    for await (const event of readEvents(stream)) events.push(event);
    assert.equal(events[0].note, "résumé ✓");
});

test("API error bodies become readable messages", async () => {
    assert.equal(await errorMessage(Response.json({ detail: "File is larger than 10 MiB." }, { status: 413 })), "File is larger than 10 MiB.");
    assert.equal(await errorMessage(Response.json({ detail: [{ msg: "Field required" }] }, { status: 422 })), "Field required");
    assert.match(await errorMessage(new Response("oops", { status: 500 })), /HTTP 500/);
});

test("every backend analyzer has a label and description", () => {
    for (const name of ["decomposer", "color_remapping", "file", "exiftool", "binwalk", "foremost", "outguess",
        "pngcheck", "pcrt", "identify", "steghide", "zsteg", "strings"]) {
        assert.ok(ANALYZER_INFO[name]?.label && ANALYZER_INFO[name]?.description, name);
    }
});

test("a stream that ends without its done event is reported as incomplete", async () => {
    const seen = [];
    await assert.rejects(async () => {
        for await (const event of untilDone(readEvents(streamOf('{"event":"start","id":"x"}\n{"event":"result","analyzer":"file"}\n')))) {
            seen.push(event.event);
        }
    }, { message: INCOMPLETE_ANALYSIS });
    assert.deepEqual(seen, ["start", "result"]);
});

test("a complete stream passes through untilDone unchanged", async () => {
    const seen = [];
    for await (const event of untilDone(readEvents(streamOf('{"event":"start"}\n{"event":"done","duration_ms":1}\n')))) {
        seen.push(event.event);
    }
    assert.deepEqual(seen, ["start", "done"]);
});

test("byte sizes format consistently", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1536), "1.5 KiB");
    assert.equal(formatBytes(10 * 1024 * 1024), "10.0 MiB");
});
