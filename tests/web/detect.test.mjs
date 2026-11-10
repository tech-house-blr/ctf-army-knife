import test from "node:test";
import assert from "node:assert/strict";
import { detectText, detectFile, cyberChefLink } from "../../apps/web/lib/detect.ts";

const best = (text) => detectText(text)?.tools[0];

test("empty input suggests nothing", () => {
    assert.equal(detectText("   \n "), null);
});

test("armored OpenPGP goes to the GPG decoder", () => {
    assert.equal(best("-----BEGIN PGP MESSAGE-----\n\nhQEMA...\n-----END PGP MESSAGE-----"), "gpg-decoder");
    assert.equal(best("-----BEGIN PGP PUBLIC KEY BLOCK-----\nmDMEZ...\n"), "gpg-decoder");
});

test("letter-only words go to the cryptogram solver", () => {
    assert.equal(best("GSV JFRXP YILDM ULC QFNKH LEVI GSV OZAB WLT"), "cryptogram-solver");
    assert.equal(best("Uryyb, jbeyq! Guvf vf n grfg."), "cryptogram-solver");
});

test("encodings go to CyberChef", () => {
    assert.equal(best("ZmxhZ3t0ZWNoX2hvdXNlfQ=="), "cyberchef");
    assert.equal(best("66 6c 61 67 7b 7d"), "cyberchef");
    assert.equal(best("666c61677b7d"), "cyberchef");
    assert.equal(best("{\"a\": 1, \"b\": [2, 3]}"), "cyberchef");
});

test("files go to AperiSolve", () => {
    assert.equal(detectFile(new File(["x"], "a.png", { type: "image/png" })).tools[0], "aperisolve");
    assert.equal(detectFile(new File(["x"], "a.wav", { type: "audio/wav" })).label, "Audio file");
    assert.equal(detectFile(new File(["x"], "a.bin")).tools[0], "aperisolve");
});

test("CyberChef links carry UTF-8 input as Base64 with the Magic recipe", () => {
    const link = cyberChefLink("flag{é}");
    assert.match(link, /^\/cyberchef#recipe=Magic\(/);
    const input = decodeURIComponent(link.match(/input=([^&]+)/)[1]);
    assert.equal(new TextDecoder().decode(Uint8Array.from(atob(input), (c) => c.charCodeAt(0))), "flag{é}");
});
