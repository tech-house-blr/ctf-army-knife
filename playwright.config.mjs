import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/browser",
    timeout: 90_000,
    expect: { timeout: 30_000 },
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: { baseURL: "http://127.0.0.1:4000", trace: "retain-on-failure" },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    ],
    webServer: {
        command: "npm run start",
        url: "http://127.0.0.1:4000",
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
