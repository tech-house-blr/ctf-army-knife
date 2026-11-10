import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import configure from "../../integration/cyberchef/webpack-compat.cjs";

// Evaluate the actual pinned rules without loading heavyweight build plugins.
// Missing vendor source is a valid state before the initial source import.
const require = createRequire(import.meta.url);
const upstreamFile = new URL("../../vendor/cyberchef/webpack.config.js", import.meta.url);
let upstream;
try { upstream = await readFile(upstreamFile, "utf8"); } catch (error) {
    if (error.code !== "ENOENT") throw error;
}

function rules(patched) {
    const fakeRequire = (name) => name === "path" ? require("node:path") :
        name === "zlib" ? require("node:zlib") : new Proxy(function () {}, { get: () => function () {} });
    fakeRequire.resolve = (name) => name;
    const upstreamModule = { exports: {} };
    vm.runInNewContext(upstream, { require: fakeRequire, module: upstreamModule, __dirname: "project", RegExp });
    return (patched ? configure(upstreamModule.exports) : upstreamModule.exports).module.rules;
}

function matches(rule, resource) {
    const evaluate = (condition) => !condition || (typeof condition === "function" ? condition(resource) : condition.test(resource));
    return evaluate(rule.test) && evaluate(rule.include) && (!rule.exclude || !evaluate(rule.exclude));
}

test("Windows and POSIX dependency paths do not send OpenPGP or core-js through Babel", { skip: !upstream }, () => {
    const original = rules(false).find((rule) => rule.loader === "babel-loader");
    const babel = rules(true).find((rule) => rule.loader === "babel-loader");
    const windows = "D:\\project\\node_modules\\openpgp\\dist\\openpgp.min.mjs";
    assert.equal(matches(original, windows), true, "reproduces the upstream Windows defect");
    for (const prefix of ["D:\\project\\", "/project/"]) {
        const separator = prefix.includes("\\") ? "\\" : "/";
        for (const dependency of ["openpgp/dist/openpgp.min.mjs", "core-js-pure/modules/es.global-this.js"]) {
            assert.equal(matches(babel, prefix + "node_modules" + separator + dependency.replaceAll("/", separator)), false);
        }
        assert.equal(matches(babel, prefix + "src" + separator + "web" + separator + "index.js"), true);
        assert.equal(matches(babel, prefix + ["node_modules", "crypto-api", "index.js"].join(separator)), true);
    }
});

test("bitmap font PNG files get resource rules on Windows and POSIX", { skip: !upstream }, () => {
    for (const prefix of ["D:\\project\\", "/project/"]) {
        const separator = prefix.includes("\\") ? "\\" : "/";
        const resource = prefix + "src/web/static/fonts/bmfonts/Roboto72White.png".replaceAll("/", separator);
        const assets = rules(true).filter((rule) => rule.type?.startsWith("asset/") && matches(rule, resource));
        assert.equal(assets.length, 1);
        assert.equal(assets[0].generator.filename, "assets/fonts/[name][ext]");
    }
});

test("JavaScript import shims do not run on Bootstrap stylesheets", { skip: !upstream }, () => {
    for (const separator of ["/", "\\"]) {
        const prefix = ["project", "node_modules", "bootstrap-material-design"].join(separator);
        const shims = rules(true).filter((rule) => rule.loader === "imports-loader");
        assert.equal(shims.some((rule) => matches(rule, prefix + separator + "dist/css/bootstrap-material-design.css")), false);
        assert.equal(shims.some((rule) => matches(rule, prefix + separator + "js/index.js")), true);
    }
});
