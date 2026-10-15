/* CTF Army Knife integration. Loaded before the upstream application. */
(() => {
    "use strict";

    const channel = "ctf-army-knife:cyberchef:v1";
    const embedded = window.parent !== window;
    let ready = false;
    let lastHash = window.location.hash;
    let applying = false;
    let pendingHash = null;

    function send(type, hash = window.location.hash) {
        if (embedded) {
            window.parent.postMessage({ channel, type, hash }, window.location.origin);
        }
    }

    function reportHash() {
        if (!ready || applying || window.location.hash === lastHash) return;
        lastHash = window.location.hash;
        send("hash");
    }

    // CyberChef replaces history entries rather than emitting hashchange.
    const replaceState = window.history.replaceState.bind(window.history);
    window.history.replaceState = function (...args) {
        // Upstream option/worker initialization can publish an empty state
        // before loadURIParams reads the initial recipe. Retain that fragment
        // until the application has finished loading it.
        if (!ready && args.length >= 3) {
            args[2] = window.location.pathname + window.location.search + lastHash;
        }
        replaceState(...args);
        reportHash();
    };
    window.addEventListener("hashchange", reportHash);

    window.addEventListener("message", (event) => {
        if (!embedded || event.origin !== window.location.origin || event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.channel !== channel) return;
        if (message.type === "ping") {
            if (ready) send("ready");
            return;
        }
        if (message.type !== "navigate" || typeof message.hash !== "string" ||
            (message.hash !== "" && !message.hash.startsWith("#"))) return;
        if (message.hash === window.location.hash) return;
        applying = true;
        replaceState(null, "", window.location.pathname + window.location.search + message.hash);
        lastHash = message.hash;
        if (ready) {
            // URI loading leaves omitted fields unchanged upstream. Clear them
            // explicitly so back/forward to an empty fragment restores empty IO.
            window.app.setRecipeConfig([]);
            window.app.setInput("");
            window.app.loadURIParams();
        } else pendingHash = message.hash;
        applying = false;
    });

    window.addEventListener("error", () => {
        if (!ready) send("error");
    });
    window.addEventListener("unhandledrejection", () => {
        if (!ready) send("error");
    });

    document.addEventListener("apploaded", () => {
        ready = true;
        const app = window.app;
        if (pendingHash !== null) {
            applying = true;
            replaceState(null, "", window.location.pathname + window.location.search + pendingHash);
            app.setRecipeConfig([]);
            app.setInput("");
            app.loadURIParams();
            applying = false;
            pendingHash = null;
        }
        const controls = app.manager.controls;
        const generateStateUrl = controls.generateStateUrl.bind(controls);
        controls.generateStateUrl = (...args) => {
            const original = generateStateUrl(...args);
            const hashIndex = original.indexOf("#");
            return window.location.origin + "/cyberchef" + (hashIndex < 0 ? "" : original.slice(hashIndex));
        };
        // Share links use the stable wrapper route, but the iframe itself must
        // stay at its versioned asset URL for workers and relative imports.
        const updateURL = app.updateURL.bind(app);
        app.updateURL = (...args) => {
            const generateShareUrl = controls.generateStateUrl;
            controls.generateStateUrl = generateStateUrl;
            try {
                updateURL(...args);
            } finally {
                controls.generateStateUrl = generateShareUrl;
                document.title = "CTF Army Knife · " + document.title;
            }
        };
        const notice = document.getElementById("notice");
        if (notice) {
            notice.textContent = "CTF Army Knife · CyberChef (community build)";
            notice.removeAttribute("data-help");
        }
        lastHash = window.location.hash;
        send("ready");
    }, { once: true });
})();
