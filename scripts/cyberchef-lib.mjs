import { createHash } from "node:crypto";
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export async function inventory(directory, prefix = "") {
    const files = {};
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if ([".git", "node_modules", "build"].includes(entry.name)) continue;
        const name = prefix + entry.name;
        const absolute = path.join(directory, entry.name);
        if ((await lstat(absolute)).isSymbolicLink()) throw new Error(`Unexpected symbolic link: ${absolute}`);
        if (entry.isDirectory()) Object.assign(files, await inventory(absolute, `${name}/`));
        else files[name] = sha256(await readFile(absolute));
    }
    return files;
}

export function assertCoverage(expected, actual) {
    const left = Object.keys(expected).sort();
    const right = Object.keys(actual).sort();
    if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error("Upstream file coverage changed: missing or added files.");
    for (const name of left) {
        if (expected[name] !== actual[name]) throw new Error(`Upstream operation or configuration changed: ${name}`);
    }
}

export function replaceOnce(source, before, after, label) {
    if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
        throw new Error(`Upstream layout changed; review the ${label} customization before building.`);
    }
    return source.replace(before, after);
}

export function assetPath(buildId, file = "index.html") {
    if (!/^[a-f0-9]{20}$/.test(buildId)) throw new Error("Invalid CyberChef build ID.");
    return `/tools/cyberchef/${buildId}/${file}`;
}

export function safeChild(root, relative) {
    const resolved = path.resolve(root, relative);
    const local = path.relative(path.resolve(root), resolved);
    if (!local || local.startsWith(`..${path.sep}`) || local === ".." || path.isAbsolute(local)) {
        throw new Error(`Path must stay inside the managed directory: ${relative}`);
    }
    return resolved;
}
