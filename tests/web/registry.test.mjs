import test from "node:test";
import assert from "node:assert/strict";
import { readdir, access } from "node:fs/promises";
import { tools } from "../../apps/web/lib/tools/registry.ts";

const appDir = new URL("../../apps/web/app/", import.meta.url);
const exists = (url) => access(url).then(() => true, () => false);
// Top-level app/ folders that are not tools.
const NON_TOOL_ROUTES = new Set(["api"]);

test("tool slugs are unique kebab-case", () => {
    const slugs = tools.map((tool) => tool.slug);
    assert.equal(new Set(slugs).size, slugs.length, "duplicate slug in registry");
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `"${slug}" is not kebab-case`);
});

test("every registry entry has a page at app/<slug>/page.tsx", async () => {
    for (const { slug } of tools) {
        assert.ok(await exists(new URL(`${slug}/page.tsx`, appDir)), `registry lists "${slug}" but app/${slug}/page.tsx is missing`);
    }
});

test("every tool page is listed in the registry", async () => {
    const slugs = new Set(tools.map((tool) => tool.slug));
    for (const entry of await readdir(appDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || NON_TOOL_ROUTES.has(entry.name) || /^[_(.[]/.test(entry.name)) continue;
        if (!await exists(new URL(`${entry.name}/page.tsx`, appDir))) continue;
        assert.ok(slugs.has(entry.name), `app/${entry.name}/page.tsx exists but is not in lib/tools/registry.ts`);
    }
});
