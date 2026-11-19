import { entries } from "./data.generated.ts";
import type { CategoryId, Command, DetectionKind, Entry, TypeId } from "./types.ts";

export { entries };
export type { CategoryId, Command, DetectionKind, Entry, TypeId };

const entryByName = new Map(entries.map((entry) => [entry.name.toLowerCase(), entry]));

export const getEntry = (name: string): Entry | undefined => entryByName.get(name.toLowerCase());

/** Categories in the order the page lists them: the common ones first. */
export const CATEGORY_ORDER: readonly CategoryId[] = [
    "Execute",
    "Download",
    "AWL Bypass",
    "ADS",
    "Dump",
    "Copy",
    "UAC Bypass",
    "Compile",
    "Tamper",
    "Credentials",
    "Upload",
    "Reconnaissance",
    "Decode",
    "Encode",
    "Conceal",
];

/** Upstream folders, labelled for the Type filter. */
export const TYPES: readonly { id: TypeId; label: string }[] = [
    { id: "OSBinaries", label: "OS binary" },
    { id: "OSLibraries", label: "OS library" },
    { id: "OSScripts", label: "OS script" },
    { id: "OtherMSBinaries", label: "Other Microsoft binary" },
    { id: "HonorableMentions", label: "Honorable mention" },
];

export const typeLabel = (id: TypeId) => TYPES.find((type) => type.id === id)?.label ?? id;

export type PrivilegeLevel = "user" | "admin" | "system" | "other";

export const PRIVILEGE_LEVELS: readonly { id: PrivilegeLevel; label: string }[] = [
    { id: "user", label: "User" },
    { id: "admin", label: "Administrator" },
    { id: "system", label: "SYSTEM" },
    { id: "other", label: "Other" },
];

/**
 * Group upstream's free-text privileges ("Admin", "Local Administrator - ...",
 * "User, Administrator in Windows 8", "DNS admin", ...) by what they start
 * with. Anything unrecognised, such as a group membership, is "other"; the
 * page always shows the original text as well.
 */
export function privilegeLevel(privileges: string): PrivilegeLevel {
    const text = privileges.trim().toLowerCase();
    if (/^system\b/.test(text)) return "system";
    if (/^(local )?admin/.test(text)) return "admin";
    if (/^(user|any|low privileges)\b/.test(text)) return "user";
    return "other";
}

export type Filters = { query?: string; category?: CategoryId; type?: TypeId; privilege?: PrivilegeLevel };

/** A query that looks like a MITRE ATT&CK technique id, e.g. "T1218" or "t1218.011". */
const MITRE_QUERY = /^t\d{4}(\.\d{0,3})?$/;

const nameRank = (entry: Entry, needle: string) => {
    if (!needle) return 0;
    let best = -1;
    for (const name of [entry.name, ...(entry.aliases ?? [])]) {
        const lower = name.toLowerCase();
        const rank =
            lower === needle || lower.replace(/\.[^.]+$/, "") === needle
                ? 0
                : lower.startsWith(needle)
                  ? 1
                  : lower.includes(needle)
                    ? 2
                    : -1;
        if (rank >= 0 && (best < 0 || rank < best)) best = rank;
    }
    return best;
};

/**
 * The commands of `entry` that match the filters. A query that matches the
 * entry's name (or an alias) keeps all its commands; a query that only matches
 * MITRE technique ids keeps the commands with that technique or a
 * sub-technique of it.
 */
export function commandsFor(entry: Entry, { query = "", category, privilege }: Filters = {}): Command[] {
    const needle = query.trim().toLowerCase();
    const byId = needle && nameRank(entry, needle) < 0;
    return entry.commands.filter(
        (command) =>
            (!category || command.category === category) &&
            (!privilege || privilegeLevel(command.privileges) === privilege) &&
            (!byId || (MITRE_QUERY.test(needle) && command.mitreId.toLowerCase().startsWith(needle))),
    );
}

/**
 * Entries matching the filters, best first. The query matches names and
 * aliases (exact, with or without the extension, then prefix, then substring,
 * case-insensitive) and MITRE ATT&CK ids. Category and privilege filters keep
 * entries with at least one matching command.
 */
export function searchEntries(filters: Filters = {}): Entry[] {
    const needle = (filters.query ?? "").trim().toLowerCase();
    return entries
        .filter((entry) => !filters.type || entry.type === filters.type)
        .map((entry, index) => {
            const rank = nameRank(entry, needle);
            return { entry, index, rank: rank < 0 ? 3 : rank };
        })
        .filter(({ entry }) => commandsFor(entry, filters).length > 0)
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map(({ entry }) => entry);
}

/** Values the page lets the user fill in, replacing upstream's placeholders. */
export type Variables = { url: string; dir: string; smb: string; cmd: string };

/** The example values the official LOLBAS site shows for each placeholder. */
export const DEFAULT_VARIABLES: Variables = {
    url: "https://www.example.org",
    dir: "C:\\Windows\\Temp",
    smb: "\\\\servername\\C$\\Windows\\Temp",
    cmd: "cmd /c c:\\windows\\system32\\calc.exe",
};

/** A piece of a command: literal text, or an expanded placeholder with a hint explaining it. */
export type Segment = { text: string; hint?: string };

const PLACEHOLDER = /\{(PATH|PATH_ABSOLUTE|PATH_SMB|REMOTEURL)(?::(folder|\.[a-zA-Z0-9.]+?))?\}|\{CMD(:args)?\}|\{PID\}/g;

/**
 * Split a command into text and expanded placeholders, the way the official
 * site renders them: `{PATH:.exe}` -> `file.exe`, `{PATH_ABSOLUTE:folder}` ->
 * `C:\Windows\Temp\folder`, `{REMOTEURL:.ps1}` -> `https://www.example.org/file.ps1`,
 * `{CMD}` -> a command line, `{PID}` -> a process id. Empty variables fall back
 * to those defaults. Placeholders the site leaves alone ({GUID}, {PORT}, ...)
 * stay as written.
 */
export function expandSegments(command: string, variables: Partial<Variables> = {}): Segment[] {
    const value = (key: keyof Variables) => variables[key] || DEFAULT_VARIABLES[key];
    const base = (key: "dir" | "smb") => value(key).replace(/\\+$/, "");
    const text = command.trimEnd();
    const segments: Segment[] = [];
    let last = 0;
    for (const match of text.matchAll(PLACEHOLDER)) {
        const [token, kind, suffix, args] = match;
        if (match.index > last) segments.push({ text: text.slice(last, match.index) });
        last = match.index + token.length;

        if (token === "{PID}") {
            segments.push({ text: "1234", hint: "A process ID." });
            continue;
        }
        if (token.startsWith("{CMD")) {
            segments.push(
                args
                    ? { text: "/arg1 /arg2", hint: "Command-line arguments." }
                    : { text: value("cmd"), hint: "A command line." },
            );
            continue;
        }
        const folder = suffix === "folder";
        const file = folder ? "folder" : `file${suffix ?? ".ext"}`;
        const what = folder ? "folder" : `file with ${suffix ? `a ${suffix}` : "an arbitrary"} extension`;
        switch (kind) {
            case "PATH":
                segments.push({ text: file, hint: `A relative or absolute path to a ${what}.` });
                break;
            case "PATH_ABSOLUTE":
                segments.push({ text: `${base("dir")}\\${file}`, hint: `An absolute path to a ${what}.` });
                break;
            case "PATH_SMB":
                segments.push({ text: `${base("smb")}\\${file}`, hint: `An SMB path to a ${what}.` });
                break;
            default:
                segments.push({ text: `${value("url").replace(/\/+$/, "")}/${file}`, hint: `A URL for a ${what}.` });
        }
    }
    const rest = text.slice(last);
    if (rest) segments.push({ text: rest });
    return segments;
}

/** A command with its placeholders expanded, ready to copy. */
export const expand = (command: string, variables: Partial<Variables> = {}) =>
    expandSegments(command, variables)
        .map((segment) => segment.text)
        .join("");

/** The ATT&CK page for a technique id ("T1218.011" -> .../techniques/T1218/011/). */
export const mitreUrl = (id: string) =>
    /^T\d{4}(\.\d{3})?$/.test(id) ? `https://attack.mitre.org/techniques/${id.replace(".", "/")}/` : undefined;

/** True for links safe to render as anchors. */
export const isWebLink = (value: string) => /^https?:\/\//i.test(value);

/** A short label for a link: a GitHub file's name, otherwise the host and path. */
export function linkLabel(url: string): string {
    try {
        const parsed = new URL(url);
        if (/^(www\.)?github\.com$/.test(parsed.hostname) && parsed.pathname.includes("/blob/")) {
            return parsed.pathname.split("/").pop() || url;
        }
        return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`;
    } catch {
        return url;
    }
}
