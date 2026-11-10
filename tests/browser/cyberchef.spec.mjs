import { test, expect } from "@playwright/test";

const recipeLink = (recipe, input = "") => `/cyberchef#recipe=${recipe}&input=${encodeURIComponent(Buffer.from(input).toString("base64"))}&ienc=65001&oenc=65001`;

async function openWorkspace(page, url = "/cyberchef") {
    await page.goto(url);
    await expect(page.getByText("Loading CyberChef and its workers…")).toBeHidden({ timeout: 60_000 });
    const frame = page.frameLocator('iframe[title="CyberChef workspace"]');
    await expect(frame.locator("#search")).toBeVisible();
    return frame;
}

test("loads the full local catalog without external dependencies or missing resources", async ({ page, request }) => {
    const manifest = await (await request.get("/tools/cyberchef/manifest.json")).json();
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) failures.push(response.url()); });
    await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    });
    const frame = await openWorkspace(page, recipeLink("SHA2('256',64,160)", "abc"));
    await expect(frame.locator("#output .cm-content")).toContainText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const actual = await frame.locator("body").evaluate(() => Object.keys(window.app.operations).sort());
    expect(actual).toEqual(manifest.operations);
    expect(failures).toEqual([]);
    const entry = await request.get(manifest.entry);
    expect(entry.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(entry.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
});

for (const example of [
    { recipe: "To_Base64('A-Za-z0-9%2B/%3D')", input: "hello", output: "aGVsbG8=" },
    { recipe: "From_Base64('A-Za-z0-9%2B/%3D',true,false)", input: "aGVsbG8=", output: "hello" },
    { recipe: "To_Hex('Space',0)", input: "abc", output: "61 62 63" },
    { recipe: "From_Hex('Auto')", input: "61 62 63", output: "abc" },
    { recipe: "To_Base64('A-Za-z0-9%2B/%3D')From_Base64('A-Za-z0-9%2B/%3D',true,false)", input: "Hello 🌍", output: "Hello 🌍" },
    { recipe: "Gzip()Gunzip()", input: "CTF Army Knife", output: "CTF Army Knife" },
]) {
    test(`known answer / round trip: ${example.recipe}`, async ({ page }) => {
        const frame = await openWorkspace(page, recipeLink(example.recipe, example.input));
        await expect(frame.locator("#output .cm-content")).toHaveText(example.output);
    });
}

test("recipe edits update the parent URL without remounting; shared links survive a fresh context", async ({ page, browser }) => {
    const frame = await openWorkspace(page, recipeLink("To_Hex('Space',0)", "abc"));
    const child = page.frames().find((item) => /\/tools\/cyberchef\//.test(item.url()));
    const initialPath = new URL(child.url()).pathname;
    await frame.locator("#search").fill("To Base64");
    await frame.locator("#search").dispatchEvent("search");
    await frame.locator("#search-results li.operation").filter({ hasText: "To Base64" }).first().dblclick();
    await expect.poll(() => decodeURIComponent(page.url())).toContain("To_Base64");
    expect(new URL(child.url()).pathname).toBe(initialPath);
    // Clear the search to dismiss its operation-help popover before using the
    // recipe toolbar, just as a user would after choosing an operation.
    await frame.locator("#search").fill("");
    await frame.locator("#search").dispatchEvent("search");
    await frame.locator("#save").click();
    const generated = await frame.locator("#save-link").getAttribute("href");
    expect(generated).toContain("/cyberchef#");
    const context = await browser.newContext();
    try {
        const fresh = await context.newPage();
        await openWorkspace(fresh, page.url());
        await expect(fresh.frameLocator("iframe").locator("#rec-list li.operation")).toHaveCount(2);
    } finally { await context.close(); }
});

test("parent navigation clears an empty recipe and supports browser back/forward", async ({ page }) => {
    const frame = await openWorkspace(page, recipeLink("To_Hex('Space',0)", "abc"));
    await expect(frame.locator("#rec-list li.operation")).toHaveCount(1);
    await page.evaluate(() => { window.location.hash = ""; });
    await expect(frame.locator("#rec-list li.operation")).toHaveCount(0);
    await page.goBack();
    await expect(frame.locator("#rec-list li.operation")).toHaveCount(1);
    await page.goForward();
    await expect(frame.locator("#rec-list li.operation")).toHaveCount(0);
});

test("settings, file loading, output download, and the sidebar remain reachable", async ({ page }) => {
    const frame = await openWorkspace(page, recipeLink("To_Hex('Space',0)", "abc"));
    await frame.locator("#options").click();
    await expect(frame.locator("#options-modal")).toBeVisible();
    await frame.locator("#theme").selectOption("ctf-community");
    await frame.locator('#options-modal [data-dismiss="modal"]').last().click();
    await frame.locator("#open-file").setInputFiles({ name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("abc") });
    await expect(frame.locator("#output .cm-content:visible")).toContainText("61 62 63");
    const download = page.waitForEvent("download");
    page.once("dialog", (dialog) => dialog.accept("output.txt"));
    await frame.locator("#save-to-file").click();
    expect((await download).suggestedFilename()).toBeTruthy();
    // From 1280px up the tool rail is always visible; below that it sits behind "Open navigation".
    const openNavigation = page.getByRole("button", { name: "Open navigation" });
    if (await openNavigation.isVisible()) await openNavigation.click();
    await page.getByRole("link", { name: "All tools", exact: true }).click();
    await expect(page.getByRole("heading", { name: "CTF Army Knife" })).toBeVisible();
});

test("missing worker gives a recovery action; retry recovers without losing the parent fragment", async ({ page }) => {
    test.setTimeout(150_000);
    await page.route("**/tools/cyberchef/**", (route) => route.abort());
    await page.goto(recipeLink("To_Hex('Space',0)", "abc"));
    await expect(page.getByRole("button", { name: "Retry loading" })).toBeVisible({ timeout: 70_000 });
    await page.unroute("**/tools/cyberchef/**");
    await page.getByRole("button", { name: "Retry loading" }).click();
    await expect(page.frameLocator("iframe").locator("#output .cm-content")).toContainText("61 62 63", { timeout: 60_000 });
});

test("narrow viewport keeps workspace and navigation available", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);
    await expect(page.locator('iframe[title="CyberChef workspace"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
});
