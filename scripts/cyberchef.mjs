import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile, access, rm, rename, lstat, realpath, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { inventory, sha256, assertCoverage, replaceOnce, assetPath, safeChild } from "./cyberchef-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const integration = path.join(root, "integration/cyberchef");
const source = path.join(root, "vendor/cyberchef");
const cache = path.join(root, ".cache/cyberchef");
const work = path.join(cache, "work");
const staging = path.join(root, "apps/web/public/tools/cyberchef");
const upstream = JSON.parse(await readFile(path.join(integration, "upstream.json"), "utf8"));
const baselineFile = path.join(integration, "upstream-files.json");
const action = process.argv[2] || "build";

function run(executable, args, cwd = root, capture = false, env = {}) {
    // Invoke npm's JS entry directly on Windows; avoid shell quoting and .cmd spawning.
    if (executable === "npm") {
        if (!process.env.npm_execpath) throw new Error("Run this command through npm run so npm's executable can be located.");
        args = [process.env.npm_execpath, ...args];
        executable = process.execPath;
    }
    const result = spawnSync(executable, args, {
        cwd, stdio: capture ? "pipe" : "inherit", encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, ...env },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${executable} ${args.join(" ")} failed. ${result.stderr || ""}`);
    return (result.stdout || "").trim();
}

const exists = async (file) => access(file).then(() => true, () => false);
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");

async function removeManaged(parent, relative) {
    const target = safeChild(parent, relative);
    if (!await exists(target)) return;
    // Resolve the actual path before recursive removal, including linked parents.
    const actualParent = await realpath(parent);
    const actualTarget = await realpath(target);
    const actualRoot = await realpath(root);
    safeChild(actualRoot, path.relative(actualRoot, actualParent));
    safeChild(actualParent, path.relative(actualParent, actualTarget));
    if ((await lstat(target)).isSymbolicLink()) throw new Error(`Refusing to delete symbolic link: ${target}`);
    await rm(target, { recursive: true });
}

async function importSource() {
    if (await exists(source)) throw new Error("vendor/cyberchef already exists; use the documented subtree update procedure.");
    if (run("git", ["status", "--porcelain"], root, true)) {
        throw new Error("Git subtree requires a clean working tree. Review and commit current changes before running cyberchef:import.");
    }
    run("git", ["fetch", "--no-tags", upstream.repository, `refs/tags/${upstream.tag}`]);
    const resolved = run("git", ["rev-parse", "FETCH_HEAD^{commit}"], root, true);
    if (resolved !== upstream.commit) throw new Error("Upstream tag no longer resolves to the pinned commit. Import stopped.");
    run("git", ["subtree", "add", "--prefix=vendor/cyberchef", upstream.commit, "--squash"]);
    await recordBaseline();
    console.log("Imported the pinned subtree. Review and commit integration/cyberchef/upstream-files.json before sharing the branch.");
}

async function recordBaseline() {
    // Only accept the exact reviewed Git blobs, not a snapshot of arbitrary
    // working-tree changes. Upstream Git objects are available after subtree fetch.
    const tracked = run("git", ["ls-tree", "-r", "-z", upstream.commit], root, true).split("\0").filter(Boolean);
    const files = await inventory(source);
    const expectedNames = [];
    for (const item of tracked) {
        const [metadata, name] = item.split("\t");
        const [mode, type, object] = metadata.split(" ");
        if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`Unsupported upstream Git entry: ${name}`);
        expectedNames.push(name);
        const bytes = await readFile(safeChild(source, name));
        const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
        if (actual !== object) throw new Error(`Source differs from pinned upstream Git blob: ${name}`);
    }
    if (JSON.stringify(expectedNames.sort()) !== JSON.stringify(Object.keys(files).sort())) throw new Error("Upstream tree has missing or extra files.");
    await save(baselineFile, { upstream, files });
}

async function inputState() {
    if (!await exists(path.join(source, "package.json")) || !await exists(baselineFile)) {
        throw new Error("CyberChef source is missing. On a network-enabled machine, review/commit your changes and run npm run cyberchef:import first.");
    }
    const baseline = await json(baselineFile);
    if (JSON.stringify(baseline.upstream) !== JSON.stringify(upstream)) throw new Error("Upstream pin and imported baseline disagree.");
    const files = await inventory(source);
    // The downstream customizations are applied to an isolated build tree. All
    // upstream source, including every operation and category, stays intact.
    assertCoverage(baseline.files, files);
    const customizations = await inventory(integration);
    const builder = sha256(await readFile(fileURLToPath(import.meta.url)));
    const library = sha256(await readFile(path.join(root, "scripts/cyberchef-lib.mjs")));
    const buildId = sha256(JSON.stringify({ files, customizations, builder, library, node: process.versions.node })).slice(0, 20);
    return { buildId, files };
}

async function prepare(state) {
    await mkdir(cache, { recursive: true });
    const prepared = path.join(cache, "prepared.json");
    if (await exists(prepared) && (await json(prepared)).buildId === state.buildId) return;
    // Recreate source and generated config, but retain separately locked npm
    // dependencies when only integration inputs have changed.
    if (await exists(work)) {
        for (const name of await readdir(work)) {
            if (name !== "node_modules") await removeManaged(work, name);
        }
    }
    await cp(source, work, { recursive: true, filter: (file) => !["node_modules", ".git", "build"].includes(path.basename(file)) });
    await cp(path.join(integration, "webpack-compat.cjs"), path.join(work, "ctf-webpack.cjs"));
    const webpackFile = path.join(work, "webpack.config.js");
    await writeFile(webpackFile, await readFile(webpackFile, "utf8") + '\nrequire("./ctf-webpack.cjs")(module.exports);\n');
    // Add CSS and bridge to SOURCE before compilation, including the standalone ZIP.
    const custom = path.join(work, "src/web/static/ctf");
    await mkdir(custom, { recursive: true });
    await cp(path.join(integration, "community.css"), path.join(custom, "community.css"));
    await cp(path.join(integration, "bridge.js"), path.join(custom, "bridge.js"));
    const entry = path.join(work, "src/web/index.js");
    let javascript = await readFile(entry, "utf8");
    javascript = replaceOnce(javascript, 'import "./stylesheets/index.js";',
        'import "./stylesheets/index.js";\nimport "./static/ctf/community.css";\nimport "./static/ctf/bridge.js";', "entry imports");
    javascript = replaceOnce(javascript, 'theme:               "classic",', 'theme:               "ctf-community",', "default theme");
    await writeFile(entry, javascript);
    const template = path.join(work, "src/web/html/index.html");
    let html = await readFile(template, "utf8");
    html = replaceOnce(html, '<html lang="en" class="classic">', '<html lang="en" class="ctf-community">', "initial theme");
    html = replaceOnce(html, "<title>CyberChef</title>", "<title>CTF Army Knife · CyberChef</title>", "page title");
    html = replaceOnce(html, '(JSON.parse(localStorage.getItem("options")) || {}).theme',
        '((JSON.parse(localStorage.getItem("options")) || {}).theme || "ctf-community")', "preloader theme");
    html = replaceOnce(html, '<option value="classic">Classic</option>',
        '<option value="ctf-community">CTF Army Knife</option>\n                                <option value="classic">Classic</option>', "theme selector");
    await writeFile(template, html);
    await save(prepared, { buildId: state.buildId });
}

async function installDependencies() {
    const stamp = path.join(cache, "installed.json");
    const lockHash = sha256(await readFile(path.join(work, "package-lock.json")));
    if (await exists(path.join(work, "node_modules/grunt/bin/grunt")) && await exists(stamp) && (await json(stamp)).lockHash === lockHash) return;
    run("npm", ["ci", "--no-audit", "--no-fund"], work);
    await save(stamp, { lockHash });
}

async function verify(state) {
    const manifest = await json(path.join(staging, "manifest.json"));
    if (manifest.buildId !== state.buildId || manifest.entry !== assetPath(state.buildId)) throw new Error("CyberChef build is stale. Run npm run cyberchef:build.");
    const destination = safeChild(staging, state.buildId);
    const actual = await inventory(destination);
    assertCoverage(manifest.files, actual);
    if (!actual["index.html"] || !actual["LICENSE"] || !actual["NOTICE"] || !Object.keys(actual).some((name) => name.endsWith(".zip"))) {
        throw new Error("CyberChef distribution is incomplete.");
    }
    if (!manifest.operations?.length || !manifest.categories?.length) throw new Error("Operation coverage metadata is missing.");
    console.log(`Verified CyberChef ${upstream.version}: ${manifest.operations.length} operations, ${Object.keys(actual).length} assets, build ${state.buildId}.`);
}

async function build(state) {
    if (await exists(path.join(staging, "manifest.json"))) {
        try { await verify(state); return; } catch { /* A stale or damaged distribution must be rebuilt. */ }
    }
    await prepare(state);
    await installDependencies();
    // Generate the pristine operation catalog before the production build and
    // compare it with the catalog regenerated by that build.
    run(process.execPath, ["node_modules/grunt/bin/grunt", "exec:generateConfig"], work);
    const configFile = path.join(work, "src/core/config/OperationConfig.json");
    const operations = Object.keys(await json(configFile)).sort();
    const categoriesFile = path.join(work, "src/core/config/Categories.json");
    const categories = await json(categoriesFile);
    run("npm", ["run", "build"], work, false, {
        GITHUB_SHA: upstream.commit,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
    });
    if (JSON.stringify(operations) !== JSON.stringify(Object.keys(await json(configFile)).sort()) ||
        JSON.stringify(categories) !== JSON.stringify(await json(categoriesFile))) {
        throw new Error("Production operation catalog differs from the pinned source.");
    }
    const output = path.join(work, "build/prod");
    await cp(path.join(work, "LICENSE"), path.join(output, "LICENSE"));
    const originalNotice = await exists(path.join(work, "NOTICE")) ? await readFile(path.join(work, "NOTICE"), "utf8") : "";
    await writeFile(path.join(output, "NOTICE"), originalNotice + "\n" + await readFile(path.join(integration, "NOTICE"), "utf8"));
    // Include the same notices inside the downloadable upstream archive.
    const { readdir } = await import("node:fs/promises");
    const archives = (await readdir(output)).filter((name) => name.endsWith(".zip"));
    if (archives.length !== 1) throw new Error("Expected exactly one downloadable CyberChef archive.");
    // grunt-zip is already a pinned upstream dependency; rebuild the download
    // after adding notices, excluding the existing ZIP to avoid recursive copies.
    const noticesTask = path.join(work, "ctf-notices.cjs");
    await writeFile(noticesTask, `module.exports = function(grunt) { require('./Gruntfile.js')(grunt); grunt.config.set('zip.standalone.src', ['build/prod/**/*', '!build/prod/*.zip', '!build/prod/index.html', '!build/prod/BundleAnalyzerReport.html']); };\n`);
    // The upstream build deletes its standalone HTML after creating the ZIP.
    // Restore it for the rebuilt download and reset the already-filled digest.
    let downloadHtml = await readFile(path.join(output, "index.html"), "utf8");
    const previousDigest = (await readFile(path.join(output, "sha256digest.txt"), "utf8")).trim();
    downloadHtml = downloadHtml.replaceAll(previousDigest, "DOWNLOAD_HASH_PLACEHOLDER");
    await writeFile(path.join(output, "index.html"), downloadHtml);
    await rm(path.join(output, "sha256digest.txt"));
    run(process.execPath, ["node_modules/grunt/bin/grunt", "--gruntfile", "ctf-notices.cjs", "copy:standalone", "zip:standalone", "clean:standalone", "calcDownloadHash"], work, false, { GITHUB_SHA: upstream.commit });
    // Regenerate compressed HTML after calcDownloadHash changes its contents.
    const { gzipSync, brotliCompressSync } = await import("node:zlib");
    const index = await readFile(path.join(output, "index.html"));
    await writeFile(path.join(output, "index.html.gz"), gzipSync(index));
    await writeFile(path.join(output, "index.html.br"), brotliCompressSync(index));
    await mkdir(staging, { recursive: true });
    const temporary = `${state.buildId}.pending`;
    await removeManaged(staging, temporary);
    await cp(output, safeChild(staging, temporary), { recursive: true });
    const files = await inventory(safeChild(staging, temporary));
    await removeManaged(staging, state.buildId);
    await rename(safeChild(staging, temporary), safeChild(staging, state.buildId));
    await save(path.join(staging, "manifest.pending.json"), {
        schema: 1, upstream, buildId: state.buildId, entry: assetPath(state.buildId), operations, categories, files,
    });
    await rename(path.join(staging, "manifest.pending.json"), path.join(staging, "manifest.json"));
    await verify(state);
}

try {
    if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Use Node.js 24 for the pinned CyberChef build.");
    if (action === "import") await importSource();
    else if (action === "baseline") await recordBaseline();
    else {
        const state = await inputState();
        if (action === "verify") await verify(state);
        else if (action === "setup") { await prepare(state); await installDependencies(); }
        else if (action === "build") await build(state);
        else if (action === "test-upstream") {
            await prepare(state);
            await installDependencies();
            run("npm", ["run", "lint"], work);
            run("npm", ["test"], work);
        } else throw new Error(`Unknown CyberChef command: ${action}`);
    }
} catch (error) {
    console.error(`CyberChef: ${error.message}`);
    process.exitCode = 1;
}
