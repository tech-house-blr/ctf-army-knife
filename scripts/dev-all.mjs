// npm run dev:all: the API (port 8000) and the web app (port 4000) in one
// terminal, with labelled output. Ctrl+C stops both; if one exits, so does the other.
// Skips the CyberChef rebuild that `npm run dev` does; run `npm run cyberchef:build`
// yourself after changing integration/cyberchef.
import { existsSync } from "node:fs";
import path from "node:path";
import { apiDir, hasVenv, root, startLabelled, stop, venv } from "./dev-lib.mjs";

if (!hasVenv()) {
    console.error("apps/api/.venv is missing. Run `npm run setup` first.");
    process.exit(1);
}
if (!existsSync(path.join(root, "apps", "web", "public", "tools", "cyberchef", "manifest.json"))) {
    console.error("CyberChef is not built yet. Run `npm run setup` (or `npm run cyberchef:build`) first.");
    process.exit(1);
}

const children = [
    startLabelled("[api]", "36", venv("uvicorn"), ["ctf_api.main:app", "--reload", "--port", "8000"], { cwd: apiDir }),
    startLabelled("[web]", "32", "npm", ["run", "dev", "-w", "@ctf-army-knife/web"], {
        env: { ...process.env, FORCE_COLOR: "1", API_URL: process.env.API_URL ?? "http://127.0.0.1:8000" },
    }),
];

let stopping = false;
function shutdown(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code; // kept even if Node exits on its own once the children are gone
    for (const child of children) stop(child);
    // Give the servers a moment to exit cleanly before returning the terminal.
    setTimeout(() => process.exit(code), 500).unref();
}

for (const child of children) {
    child.on("exit", (code) => {
        if (!stopping) console.log(`\nA server exited${code ? ` with code ${code}` : ""}; stopping the other.`);
        shutdown(code ?? 0);
    });
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting the API on http://127.0.0.1:8000 and the web app on http://localhost:4000 (Ctrl+C stops both)\n");
