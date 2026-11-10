// npm run setup: everything a fresh clone needs for local development.
// Safe to re-run: each step is skipped or refreshed as needed.
import { existsSync } from "node:fs";
import path from "node:path";
import { MIN_PYTHON, apiDir, findPython, hasVenv, root, run, venv } from "./dev-lib.mjs";

const step = (text) => console.log(`\n\x1b[1m> ${text}\x1b[0m`);

step("Node dependencies");
if (existsSync(path.join(root, "node_modules"))) console.log("node_modules present (run `npm ci` to reinstall).");
else run("npm", ["ci"]);

step("Python virtualenv for apps/api");
if (hasVenv()) {
    console.log("apps/api/.venv present.");
} else {
    const python = findPython();
    if (!python) {
        console.error(`Python ${MIN_PYTHON.join(".")} or newer is required for the API. Install it and run \`npm run setup\` again.`);
        process.exit(1);
    }
    run(python[0], [...python.slice(1), "-m", "venv", ".venv"], { cwd: apiDir });
}

step("API dependencies");
run(venv("python"), ["-m", "pip", "install", "--disable-pip-version-check", "-q", "-r", "requirements-dev.txt"], { cwd: apiDir });

step("CyberChef");
if (existsSync(path.join(root, "apps", "web", "public", "tools", "cyberchef", "manifest.json"))) {
    console.log("Already built (run `npm run cyberchef:build` after changing integration/cyberchef).");
} else {
    run("npm", ["run", "cyberchef:build"]);
}

console.log("\nReady. Start both servers with: npm run dev:all");
