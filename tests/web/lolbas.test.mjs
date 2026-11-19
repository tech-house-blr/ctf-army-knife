import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import {
    entries,
    CATEGORY_ORDER,
    TYPES,
    PRIVILEGE_LEVELS,
    getEntry,
    privilegeLevel,
    commandsFor,
    searchEntries,
    expand,
    expandSegments,
    DEFAULT_VARIABLES,
    mitreUrl,
    isWebLink,
    linkLabel,
} from "../../apps/web/lib/tools/lolbas/index.ts";

const vendor = new URL("../../vendor/lolbas/yml/", import.meta.url);
const upstreamCount = readdirSync(vendor).reduce(
    (sum, type) => sum + readdirSync(new URL(`${type}/`, vendor)).filter((f) => f.endsWith(".yml")).length,
    0,
);
const allCommands = entries.flatMap((entry) => entry.commands);

test("every vendored upstream entry is in the generated catalogue (run node scripts/lolbas.mjs if not)", () => {
    assert.equal(entries.length, upstreamCount);
    assert.deepEqual(
        [...new Set(entries.map((e) => e.type))].sort(),
        readdirSync(vendor).sort(),
        "every upstream folder is represented",
    );
});

test("category order and type list cover exactly what the data uses", () => {
    const used = new Set(allCommands.map((c) => c.category));
    assert.deepEqual([...used].sort(), [...CATEGORY_ORDER].sort());
    assert.deepEqual(new Set(entries.map((e) => e.type)), new Set(TYPES.map((t) => t.id)));
});

test("entries have unique names, commands and paths", () => {
    assert.equal(new Set(entries.map((e) => e.name.toLowerCase())).size, entries.length);
    for (const entry of entries) {
        assert.ok(entry.commands.length > 0, entry.name);
        for (const command of entry.commands) assert.ok(command.command.trim().length > 0, entry.name);
        assert.ok(Array.isArray(entry.paths), entry.name);
    }
});

test("dates stay strings instead of being parsed as Date objects", () => {
    assert.equal(getEntry("Certutil.exe").created, "2018-05-25");
    assert.ok(entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.created)), "every created date is YYYY-MM-DD");
});

test("privileges are grouped into user, admin, SYSTEM and other", () => {
    assert.equal(privilegeLevel("User"), "user");
    assert.equal(privilegeLevel("Any"), "user");
    assert.equal(privilegeLevel("Low privileges"), "user");
    assert.equal(privilegeLevel("User, Administrator in Windows 8"), "user");
    assert.equal(privilegeLevel("Admin"), "admin");
    assert.equal(privilegeLevel("Administrator"), "admin");
    assert.equal(privilegeLevel("Local Admin"), "admin");
    assert.equal(privilegeLevel("Local Administrator - required to enable local manifest setting"), "admin");
    assert.equal(privilegeLevel("Administrator, Backup Operators, SeBackupPrivilege"), "admin");
    assert.equal(privilegeLevel("SYSTEM"), "system");
    assert.equal(privilegeLevel("DNS admin"), "other");
    const levels = new Set(PRIVILEGE_LEVELS.map((p) => p.id));
    for (const command of allCommands) assert.ok(levels.has(privilegeLevel(command.privileges)));
});

test("search ranks exact (with or without extension), then prefix, then substring matches", () => {
    const names = searchEntries({ query: "certutil" }).map((e) => e.name);
    assert.equal(names[0], "Certutil.exe");
    assert.deepEqual(searchEntries({ query: "  CERTUTIL.EXE " }).map((e) => e.name), names, "trim + case-insensitive");
    const ms = searchEntries({ query: "ms" }).map((e) => e.name.toLowerCase());
    const firstSubstring = ms.findIndex((n) => !n.startsWith("ms"));
    assert.ok(firstSubstring > 0 && ms.slice(firstSubstring).every((n) => !n.startsWith("ms")));
    assert.equal(searchEntries({ query: "no-such-binary-xyz" }).length, 0);
});

test("aliases are searchable", () => {
    const withAlias = entries.find((e) => e.aliases?.length);
    assert.ok(withAlias, "upstream has at least one alias");
    assert.equal(searchEntries({ query: withAlias.aliases[0] })[0].name, withAlias.name);
});

test("a MITRE ATT&CK id finds entries and narrows their commands to that technique", () => {
    const results = searchEntries({ query: "t1218.011" });
    assert.ok(results.some((e) => e.name === "Rundll32.exe"));
    for (const entry of results) {
        const commands = commandsFor(entry, { query: "t1218.011" });
        assert.ok(commands.length > 0 && commands.every((c) => c.mitreId === "T1218.011"), entry.name);
    }
    const parent = commandsFor(getEntry("Rundll32.exe"), { query: "T1218" });
    assert.ok(parent.length > 0 && parent.every((c) => c.mitreId.startsWith("T1218")), "parent id includes sub-techniques");
    assert.equal(commandsFor(getEntry("Certutil.exe"), { query: "certutil" }).length, getEntry("Certutil.exe").commands.length);
});

test("category, type and privilege filters keep only entries with a matching command", () => {
    const downloads = searchEntries({ category: "Download" });
    assert.ok(downloads.length > 0 && downloads.length < entries.length);
    for (const entry of downloads) assert.ok(commandsFor(entry, { category: "Download" }).every((c) => c.category === "Download"));
    const libraries = searchEntries({ type: "OSLibraries" });
    assert.ok(libraries.length > 0 && libraries.every((e) => e.type === "OSLibraries"));
    const admin = searchEntries({ privilege: "admin", category: "Dump" });
    assert.ok(admin.length > 0);
    for (const entry of admin) {
        for (const c of commandsFor(entry, { privilege: "admin", category: "Dump" })) {
            assert.equal(privilegeLevel(c.privileges), "admin");
            assert.equal(c.category, "Dump");
        }
    }
});

test("placeholders expand to the official site's example values", () => {
    assert.equal(
        expand("certutil.exe -urlcache -f {REMOTEURL:.exe} {PATH:.exe}"),
        "certutil.exe -urlcache -f https://www.example.org/file.exe file.exe",
    );
    assert.equal(expand("x {PATH_ABSOLUTE:folder} {PATH}"), "x C:\\Windows\\Temp\\folder file.ext");
    assert.equal(expand("x {PATH_SMB:.dll}"), "x \\\\servername\\C$\\Windows\\Temp\\file.dll");
    assert.equal(expand("x {PATH_ABSOLUTE:.source.ext}"), "x C:\\Windows\\Temp\\file.source.ext");
    assert.equal(expand("x {REMOTEURL}"), "x https://www.example.org/file.ext");
    assert.equal(expand("run {CMD} {CMD:args} {PID}"), `run ${DEFAULT_VARIABLES.cmd} /arg1 /arg2 1234`);
    assert.equal(expand("keep {GUID} {PORT}"), "keep {GUID} {PORT}", "unknown placeholders stay as written");
});

test("filled-in variables replace the defaults, and empty ones fall back", () => {
    const vars = { url: "http://10.0.0.5:8000/", dir: "C:\\Users\\Public\\", smb: "\\\\10.0.0.5\\share", cmd: "whoami" };
    assert.equal(
        expand("a {REMOTEURL:.ps1} {PATH_ABSOLUTE:.dll} {PATH_SMB:.exe} {CMD}", vars),
        "a http://10.0.0.5:8000/file.ps1 C:\\Users\\Public\\file.dll \\\\10.0.0.5\\share\\file.exe whoami",
    );
    assert.equal(expand("{REMOTEURL}", { url: "" }), expand("{REMOTEURL}"));
});

test("expanded segments carry hints and rejoin to the expanded command", () => {
    const segments = expandSegments("a {PATH:.exe} b\n");
    assert.deepEqual(segments, [
        { text: "a " },
        { text: "file.exe", hint: "A relative or absolute path to a file with a .exe extension." },
        { text: " b" },
    ]);
    for (const command of allCommands) {
        assert.equal(expandSegments(command.command).map((s) => s.text).join(""), expand(command.command));
    }
});

test("every placeholder the site expands is expanded in the catalogue", () => {
    const leftover = new Set();
    for (const command of allCommands) {
        for (const token of expand(command.command).match(/\{[A-Z_]+(?::[^}]*)?\}/g) ?? []) leftover.add(token);
    }
    for (const token of leftover) assert.doesNotMatch(token, /^\{(PATH|PATH_ABSOLUTE|PATH_SMB|REMOTEURL|CMD|PID)[:}]/, token);
});

test("link helpers", () => {
    assert.equal(mitreUrl("T1218.011"), "https://attack.mitre.org/techniques/T1218/011/");
    assert.equal(mitreUrl("T1105"), "https://attack.mitre.org/techniques/T1105/");
    assert.equal(mitreUrl("not an id"), undefined);
    assert.ok(isWebLink("https://example.org"));
    assert.ok(!isWebLink("javascript:alert(1)"));
    assert.equal(linkLabel("https://github.com/SigmaHQ/sigma/blob/abc/rules/x/rule_name.yml"), "rule_name.yml");
    assert.equal(linkLabel("https://www.hexacorn.com/blog/2020/08/23/x/"), "hexacorn.com/blog/2020/08/23/x");
    assert.equal(linkLabel("not a url"), "not a url");
});
