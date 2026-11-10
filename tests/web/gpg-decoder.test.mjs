import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decode, PgpPacketDecoder } from "../../apps/web/lib/tools/gpg-decoder/index.js";

// Fixtures were generated with GnuPG using a throwaway test key.
const fixture = (name) => readFile(new URL(`./fixtures/${name}.asc`, import.meta.url), "utf8");
const titles = (result) => result.packets.map((packet) => packet.toViewModel().title);
const field = (result, packetIndex, name) =>
    result.packets[packetIndex].toViewModel().fields.find((item) => item.name === name)?.value;

test("decodes an armored public key into key, user ID, and signature packets", async () => {
    const result = decode(await fixture("public-key"));
    assert.deepEqual(titles(result), ["Public Key Packet (0x6)", "User ID Packet (0xd)", "Signature Packet (0x2)"]);
    assert.equal(field(result, 1, "userId"), "CTF Test <ctf@example.com>");
});

test("decodes a symmetrically encrypted message", async () => {
    const result = decode(await fixture("symmetric"));
    assert.deepEqual(titles(result), [
        "Symmetric-Key Encrypted Session Key Packet (0x3)",
        "Sym. Encrypted and Integrity Protected Data Packet (0x12)",
    ]);
});

test("decodes an uncompressed signed message and exposes the literal data", async () => {
    const result = decode(await fixture("signed-uncompressed"));
    assert.deepEqual(titles(result), ["One-Pass Signature Packet (0x4)", "Literal Data Packet (0xb)", "Signature Packet (0x2)"]);
});

test("field spans stay inside the decoded byte range", async () => {
    const result = decode(await fixture("public-key"));
    for (const packet of result.packets) {
        for (const { span } of packet.toViewModel().fields) {
            assert.ok(span[0] >= 0 && span[0] <= span[1] && span[1] <= result.bytes.length);
        }
    }
});

test("rejects non-string and non-OpenPGP input", () => {
    assert.throws(() => decode(42), TypeError);
    assert.throws(() => decode("AAAA"), /Invalid OpenPGP packet header/);
    assert.throws(() => new PgpPacketDecoder({ Hex: {} }), /Hex.encodePretty/);
});
