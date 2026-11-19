#!/usr/bin/env node
// Regenerate apps/web/lib/tools/lolbas/data.generated.ts from the pinned
// upstream snapshot in vendor/lolbas/.
//
// Each upstream entry is a YAML document in yml/<Type>/<Name>.yml, where
// <Type> is one of the folders below. The YAML is parsed with the core schema
// so dates such as `Created: 2018-05-25` stay strings, then re-serialised as
// JSON so command, description and link strings survive byte-for-byte. To
// refresh after bumping integration/lolbas/upstream.json, replace
// vendor/lolbas/ with the new snapshot and run:
//     node scripts/lolbas.mjs
import yaml from "js-yaml";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
const vendor = path("vendor/lolbas/yml/");
const outPath = path("apps/web/lib/tools/lolbas/data.generated.ts");
const pin = JSON.parse(readFileSync(path("integration/lolbas/upstream.json"), "utf8"));

// Upstream folders, which the page offers as the "Type" filter.
const TYPES = ["OSBinaries", "OSLibraries", "OSScripts", "OtherMSBinaries", "HonorableMentions"];
// Upstream command categories (CategoryList.md, with the casing the entries use).
const CATEGORIES = [
    "ADS", "AWL Bypass", "Compile", "Conceal", "Copy", "Credentials", "Decode", "Download",
    "Dump", "Encode", "Execute", "Reconnaissance", "Tamper", "UAC Bypass", "Upload",
];
const DETECTION_KINDS = ["Sigma", "Elastic", "Splunk", "BlockRule", "IOC", "Analysis"];

const folders = readdirSync(vendor).sort();
for (const folder of folders) if (!TYPES.includes(folder)) throw new Error(`unknown upstream folder "${folder}"`);

/** The single value of a one-key list item such as `- Path: C:\...`. */
const single = (item, key, where) => {
    if (!item || typeof item[key] !== "string") throw new Error(`${where}: expected "${key}: <text>"`);
    return item[key];
};

const entries = folders.flatMap((type) =>
    readdirSync(`${vendor}${type}`)
        .filter((file) => file.endsWith(".yml"))
        .map((file) => {
            const where = `${type}/${file}`;
            const data = yaml.load(readFileSync(`${vendor}${type}/${file}`, "utf8"), { schema: yaml.CORE_SCHEMA });
            for (const field of ["Name", "Description", "Author", "Created"]) {
                if (typeof data[field] !== "string") throw new Error(`${where}: missing ${field}`);
            }
            const commands = (data.Commands ?? []).map((command, i) => {
                const at = `${where} command ${i + 1}`;
                if (!CATEGORIES.includes(command.Category)) throw new Error(`${at}: unknown category "${command.Category}"`);
                const out = {
                    command: command.Command,
                    description: command.Description,
                    usecase: command.Usecase,
                    category: command.Category,
                    privileges: command.Privileges,
                    mitreId: command.MitreID,
                    os: command.OperatingSystem,
                };
                for (const [key, value] of Object.entries(out)) {
                    if (typeof value !== "string") throw new Error(`${at}: missing ${key}`);
                }
                if (command.Tags?.length) {
                    out.tags = command.Tags.map((tag) => {
                        const pairs = Object.entries(tag ?? {});
                        if (pairs.length !== 1 || typeof pairs[0][1] !== "string") throw new Error(`${at}: malformed tag`);
                        return { key: pairs[0][0], value: pairs[0][1] };
                    });
                }
                return out;
            });
            if (!commands.length) throw new Error(`${where}: no commands`);

            const out = {
                name: data.Name,
                type,
                description: data.Description,
                author: data.Author,
                created: data.Created,
            };
            if (data.Aliases?.length) out.aliases = data.Aliases.map((item) => single(item, "Alias", where));
            out.commands = commands;
            out.paths = (data.Full_Path ?? []).map((item) => single(item, "Path", where));
            const codeSamples = (data.Code_Sample ?? []).map((item) => single(item, "Code", where));
            if (codeSamples.length) out.codeSamples = codeSamples;
            const detection = (data.Detection ?? []).map((item) => {
                const [kind, value] = Object.entries(item ?? {})[0] ?? [];
                if (!DETECTION_KINDS.includes(kind) || typeof value !== "string") {
                    throw new Error(`${where}: unknown detection "${kind}"`);
                }
                return { kind, value };
            });
            if (detection.length) out.detection = detection;
            const resources = (data.Resources ?? []).map((item) => single(item, "Link", where));
            if (resources.length) out.resources = resources;
            const acknowledgements = (data.Acknowledgement ?? []).map((item) => ({
                person: single(item, "Person", where),
                ...(item.Handle ? { handle: item.Handle } : {}),
            }));
            if (acknowledgements.length) out.acknowledgements = acknowledgements;
            return out;
        }),
);

// Code-point order, so the output doesn't depend on the machine's locale.
const compare = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
entries.sort((a, b) => compare(a.name.toLowerCase(), b.name.toLowerCase()) || compare(a.name, b.name));
const seen = new Set();
for (const entry of entries) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) throw new Error(`duplicate entry name "${entry.name}"`);
    seen.add(key);
}

const lines = (items) => items.map((item) => `    ${JSON.stringify(item)},`).join("\n");

const body = `// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Generated by scripts/lolbas.mjs from vendor/lolbas/
// Upstream: ${pin.repository} @ ${pin.commit}
// LOLBAS Project (lolbas-project.github.io), GPL-3.0. See integration/lolbas/NOTICE.
// Regenerate with: node scripts/lolbas.mjs

import type { Entry } from "./types.ts";

/** Every binary, script and library, sorted by name (case-insensitive). */
export const entries: readonly Entry[] = [
${lines(entries)}
];
`;

writeFileSync(outPath, body);
const commandCount = entries.reduce((sum, entry) => sum + entry.commands.length, 0);
console.log(`lolbas: wrote ${entries.length} entries, ${commandCount} commands -> ${outPath.replace(fileURLToPath(root), "")}`);
