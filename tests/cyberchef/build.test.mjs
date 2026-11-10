import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inventory, assertCoverage, replaceOnce, assetPath, safeChild } from "../../scripts/cyberchef-lib.mjs";

test("source and distribution inventories detect missing, extra, and modified files", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ctf-cyberchef-test-"));
    try {
        await mkdir(path.join(directory, "modules"));
        await writeFile(path.join(directory, "modules/worker.js"), "original");
        const baseline = await inventory(directory);
        assertCoverage(baseline, await inventory(directory));
        await writeFile(path.join(directory, "modules/worker.js"), "changed");
        assert.throws(() => assertCoverage(baseline, { ...baseline, "modules/worker.js": "changed" }), /changed/);
        assert.throws(() => assertCoverage(baseline, {}), /coverage/);
        assert.throws(() => assertCoverage(baseline, { ...baseline, "unexpected.js": "x" }), /coverage/);
        assert.notDeepEqual(baseline, await inventory(directory));
    } finally {
        // directory is the exact temporary directory returned by mkdtemp.
        assert.ok(directory.startsWith(path.join(tmpdir(), "ctf-cyberchef-test-")));
        await rm(directory, { recursive: true });
    }
});

test("source customization fails on upstream drift instead of applying approximately", () => {
    assert.equal(replaceOnce("before marker after", "marker", "theme", "test"), "before theme after");
    assert.throws(() => replaceOnce("no match", "marker", "theme", "test"), /layout changed/);
    assert.throws(() => replaceOnce("marker marker", "marker", "theme", "test"), /layout changed/);
});

test("asset identities and cleanup targets cannot escape managed directories", () => {
    assert.equal(assetPath("0123456789abcdef0123"), "/tools/cyberchef/0123456789abcdef0123/index.html");
    assert.throws(() => assetPath("../../escape"), /Invalid/);
    const root = path.resolve("managed");
    assert.equal(safeChild(root, "one/two"), path.join(root, "one/two"));
    for (const name of ["..", "../escape", ".", root]) assert.throws(() => safeChild(root, name), /inside/);
});
