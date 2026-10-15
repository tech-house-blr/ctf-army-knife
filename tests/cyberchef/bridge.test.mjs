import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../../integration/cyberchef/bridge.js", import.meta.url), "utf8");
const channel = "ctf-army-knife:cyberchef:v1";

function workspace({ embedded = true } = {}) {
    const windowEvents = new Map();
    const documentEvents = new Map();
    const messages = [];
    const location = new URL("http://localhost:4000/tools/cyberchef/0123456789abcdef0123/index.html#recipe=To_Hex()");
    const calls = [];
    const parent = { postMessage: (value, origin) => messages.push({ value, origin }) };
    const window = {
        location, parent,
        addEventListener: (type, handler) => windowEvents.set(type, handler),
        history: { replaceState: (_state, _title, url) => { location.href = new URL(url, location).href; } },
        app: {
            manager: { controls: { generateStateUrl: () => location.origin + location.pathname + "#recipe=To_Hex()" } },
            updateURL() { window.history.replaceState(null, "", this.manager.controls.generateStateUrl()); },
            setRecipeConfig: (value) => calls.push(["recipe", value]),
            setInput: (value) => calls.push(["input", value]),
            loadURIParams: () => calls.push(["load"]),
        },
    };
    if (!embedded) window.parent = window;
    const document = {
        title: "CyberChef",
        addEventListener: (type, handler) => documentEvents.set(type, handler),
        getElementById: () => null,
    };
    vm.runInNewContext(source, { window, document });
    const dispatch = (data, overrides = {}) => windowEvents.get("message")({
        data: { channel, ...data }, origin: location.origin, source: parent, ...overrides,
    });
    return { window, document, messages, location, calls, dispatch, loaded: () => documentEvents.get("apploaded")(), events: windowEvents };
}

test("ready is emitted only after the application and workers initialize; ping supports late parent listeners", () => {
    const frame = workspace();
    frame.dispatch({ type: "ping" });
    assert.equal(frame.messages.length, 0);
    frame.loaded();
    assert.equal(frame.messages.at(-1).value.type, "ready");
    assert.equal(frame.messages.at(-1).origin, "http://localhost:4000");
    frame.dispatch({ type: "ping" });
    assert.equal(frame.messages.length, 2);
});

test("rejects wrong-origin, wrong-window, wrong-channel, and malformed navigation", () => {
    const frame = workspace();
    frame.loaded();
    const initial = frame.location.href;
    frame.dispatch({ type: "navigate", hash: "#changed" }, { origin: "https://other.example" });
    frame.dispatch({ type: "navigate", hash: "#changed" }, { source: {} });
    frame.dispatch({ channel: "other", type: "navigate", hash: "#changed" });
    frame.dispatch({ type: "navigate", hash: "https://other.example" });
    frame.dispatch({ type: "navigate", hash: {} });
    assert.equal(frame.location.href, initial);
    assert.equal(frame.calls.length, 0);
});

test("parent navigation clears omitted fields, retains the asset path, and does not echo", () => {
    const frame = workspace();
    frame.loaded();
    const count = frame.messages.length;
    frame.dispatch({ type: "navigate", hash: "" });
    assert.equal(frame.location.hash, "");
    assert.match(frame.location.pathname, /\/tools\/cyberchef\//);
    assert.equal(JSON.stringify(frame.calls), JSON.stringify([["recipe", []], ["input", ""], ["load"]]));
    assert.equal(frame.messages.length, count);
    frame.dispatch({ type: "navigate", hash: "" });
    assert.equal(frame.calls.length, 3);
});

test("upstream replaceState reports recipe edits while generated share links use the stable wrapper", () => {
    const frame = workspace();
    frame.loaded();
    const controls = frame.window.app.manager.controls;
    assert.equal(controls.generateStateUrl(), "http://localhost:4000/cyberchef#recipe=To_Hex()");
    frame.window.history.replaceState(null, "", frame.location.pathname + "#recipe=SHA256()");
    assert.equal(frame.messages.at(-1).value.hash, "#recipe=SHA256()");
    frame.window.app.updateURL();
    assert.match(frame.location.pathname, /\/tools\/cyberchef\//);
    assert.match(frame.document.title, /CTF Army Knife/);
    assert.match(controls.generateStateUrl(), /\/cyberchef#/);
});

test("navigation arriving during startup is applied after application readiness", () => {
    const frame = workspace();
    frame.dispatch({ type: "navigate", hash: "#recipe=SHA2('256')&input=YWJj" });
    assert.equal(frame.calls.length, 0);
    frame.loaded();
    assert.equal(frame.calls.at(-1)[0], "load");
    assert.equal(frame.messages.at(-1).value.hash, "#recipe=SHA2('256')&input=YWJj");
});

test("startup failures are reported, late readiness recovers, and direct mode has no parent messages", () => {
    const frame = workspace();
    frame.events.get("error")();
    assert.equal(frame.messages.at(-1).value.type, "error");
    frame.loaded();
    assert.equal(frame.messages.at(-1).value.type, "ready");
    const count = frame.messages.length;
    frame.events.get("error")();
    assert.equal(frame.messages.length, count);
    const direct = workspace({ embedded: false });
    direct.loaded();
    direct.events.get("error")();
    assert.equal(direct.messages.length, 0);
    assert.match(direct.window.app.manager.controls.generateStateUrl(), /\/cyberchef#/);
});
