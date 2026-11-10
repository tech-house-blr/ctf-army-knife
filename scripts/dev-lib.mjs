// Shared helpers for the developer scripts (setup, dev:all, test:api).
// Node built-ins only, so they run before `npm ci` and on Linux, macOS and Windows.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const apiDir = path.join(root, "apps", "api");
export const isWindows = process.platform === "win32";

const venvBin = path.join(apiDir, ".venv", isWindows ? "Scripts" : "bin");
/** Path to an executable inside the API's virtualenv (python, uvicorn, ...). */
export const venv = (name) => path.join(venvBin, isWindows ? `${name}.exe` : name);
export const hasVenv = () => existsSync(venv("python"));

export const MIN_PYTHON = [3, 12];

/** A system Python new enough for the API, as [command, ...args], or null. */
export function findPython() {
    const candidates = isWindows ? [["py", "-3"], ["python"], ["python3"]] : [["python3"], ["python"]];
    for (const [command, ...args] of candidates) {
        const result = spawnSync(command, [...args, "-c", "import sys; print(*sys.version_info[:2])"], { encoding: "utf8" });
        if (result.status !== 0) continue;
        const [major, minor] = result.stdout.trim().split(" ").map(Number);
        if (major > MIN_PYTHON[0] || (major === MIN_PYTHON[0] && minor >= MIN_PYTHON[1])) return [command, ...args];
    }
    return null;
}

/** Run a command to completion with inherited output; exit the script if it fails. */
export function run(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: "inherit", cwd: root, shell: isWindows && command === "npm", ...options });
    if (result.status !== 0) {
        console.error(`\n${[command, ...args].join(" ")} failed${result.status === null ? "" : ` (exit ${result.status})`}.`);
        process.exit(result.status ?? 1);
    }
}

/** Start a long-running process whose output lines are prefixed with a coloured label. */
export function startLabelled(label, colour, command, args, options = {}) {
    const child = spawn(command, args, {
        cwd: root,
        env: { ...process.env, FORCE_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        detached: !isWindows, // own process group, so stop() reaches its children too
        shell: isWindows && command === "npm",
        ...options,
    });
    const prefix = process.stdout.isTTY ? `\x1b[${colour}m${label}\x1b[0m ` : `${label} `;
    for (const stream of [child.stdout, child.stderr]) {
        let pending = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => {
            const lines = (pending + chunk).split(/\r?\n/);
            pending = lines.pop();
            for (const line of lines) process.stdout.write(prefix + line + "\n");
        });
        stream.on("end", () => pending && process.stdout.write(prefix + pending + "\n"));
    }
    return child;
}

/** Stop a process started by startLabelled, including anything it spawned. */
export function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
        if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        else process.kill(-child.pid, "SIGTERM");
    } catch {
        /* already gone */
    }
}
