import { contextInfo, entries, functionInfo } from "./data.generated.ts";
import type { ContextId, Entry, Example, FlagNotes, FunctionId, FunctionInfo, Helper } from "./types.ts";

export { contextInfo, entries, functionInfo };
export type { ContextId, Entry, Example, FunctionId };

const entryByName = new Map(entries.map((entry) => [entry.name, entry]));
const functionById = new Map(functionInfo.map((info) => [info.id, info]));

/** Functions in the order the page lists them: the common ones first. */
export const FUNCTION_ORDER: readonly FunctionId[] = [
    "shell",
    "command",
    "reverse-shell",
    "bind-shell",
    "file-read",
    "file-write",
    "upload",
    "download",
    "library-load",
    "privilege-escalation",
    "inherit",
];

export const getEntry = (name: string): Entry | undefined => entryByName.get(name);
export const getFunction = (id: FunctionId): FunctionInfo => {
    const info = functionById.get(id);
    if (!info) throw new Error(`Unknown GTFOBins function: ${id}`);
    return info;
};

/** The entry whose functions apply to `entry`: itself, or the end of its alias chain (rview -> view -> vim). */
export function resolveEntry(entry: Entry): Entry {
    const seen = new Set<string>();
    let current = entry;
    while (current.alias && !seen.has(current.name)) {
        seen.add(current.name);
        const next = entryByName.get(current.alias);
        if (!next) break;
        current = next;
    }
    return current;
}

/** The function ids an entry has examples for, in page order. */
export function functionsOf(entry: Entry): FunctionId[] {
    const { functions } = resolveEntry(entry);
    return FUNCTION_ORDER.filter((id) => functions[id]?.length);
}

/** The examples of one function that work in `context` (any context when omitted). */
export function examplesFor(entry: Entry, fn: FunctionId, context?: ContextId): Example[] {
    const examples = resolveEntry(entry).functions[fn] ?? [];
    return context ? examples.filter((example) => context in example.contexts) : examples;
}

/** The code to show for an example in a context: the context's own variant if it has one. */
export function exampleCode(example: Example, context?: ContextId): string {
    return (context && example.contexts[context]?.code) || example.code;
}

export type Filters = { query?: string; fn?: FunctionId; context?: ContextId };

/**
 * Entries matching the filters. The query matches names (exact first, then
 * prefix, then substring) and is case-insensitive. A function or context
 * filter keeps entries having at least one example for it; aliases count
 * through the entry they point at.
 */
export function searchEntries({ query = "", fn, context }: Filters = {}): Entry[] {
    const needle = query.trim().toLowerCase();
    const rank = (name: string) => {
        if (!needle) return 0;
        const lower = name.toLowerCase();
        if (lower === needle) return 0;
        if (lower.startsWith(needle)) return 1;
        return lower.includes(needle) ? 2 : -1;
    };
    return entries
        .filter((entry) => {
            if (rank(entry.name) < 0) return false;
            if (!fn && !context) return true;
            const functionIds = fn ? [fn] : functionsOf(entry);
            return functionIds.some((id) => examplesFor(entry, id, context).length > 0);
        })
        .map((entry, index) => ({ entry, index, rank: rank(entry.name) }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map(({ entry }) => entry);
}

/** Values the page lets the user fill in, replacing upstream's placeholders. */
export type Variables = { attacker: string; port: string; input: string; output: string };

export const DEFAULT_VARIABLES: Variables = {
    attacker: "attacker.com",
    port: "12345",
    input: "/path/to/input-file",
    output: "/path/to/output-file",
};

/** Replace upstream's placeholder host, port and file paths with the user's. Empty values keep the placeholder. */
export function substitute(code: string, variables: Partial<Variables>): string {
    let out = code;
    const swap = (placeholder: string, value: string | undefined) => {
        if (value) out = out.split(placeholder).join(value);
    };
    swap(DEFAULT_VARIABLES.input, variables.input);
    swap(DEFAULT_VARIABLES.output, variables.output);
    swap(DEFAULT_VARIABLES.attacker, variables.attacker);
    swap(DEFAULT_VARIABLES.port, variables.port);
    return out;
}

/** Plain-language caveats for an example: flags, SUID shell handling, capabilities. */
export function exampleNotes(fn: FunctionId, example: Example, context?: ContextId): string[] {
    const extra = getFunction(fn).extra;
    const notes: string[] = [];
    const flag = (value: boolean | undefined, table: FlagNotes | undefined) => {
        const note = value === undefined ? undefined : table?.[String(value) as "true" | "false"];
        if (note) notes.push(note);
    };
    flag(example.tty, extra?.tty);
    flag(example.blind, extra?.blind);
    flag(example.binary, extra?.binary);

    const detail = context ? example.contexts[context] : undefined;
    const contextExtra = contextInfo.find((info) => info.id === context)?.extra;
    if (context === "suid") flag(detail?.shell, contextExtra?.shell);
    if (context === "capabilities" && detail?.list?.length) {
        notes.push(`${contextExtra?.list ?? "Capabilities needed:"} ${detail.list.join(", ")}`);
    }
    if (context === "sudo" && contextExtra?.environment) notes.push(contextExtra.environment);
    return notes;
}

/** The comments to show: the example's own, then the chosen context's. */
export function exampleComments(example: Example, context?: ContextId): string[] {
    return [example.comment, context ? example.contexts[context]?.comment : undefined].filter(
        (comment): comment is string => Boolean(comment),
    );
}

export type AttackerSide = Helper & { kind: "listener" | "connector" | "sender" | "receiver" };

/** The attacker-side snippet an example points at (a listener, receiver, ...), if any. */
export function attackerSide(fn: FunctionId, example: Example): AttackerSide | undefined {
    const extra = getFunction(fn).extra;
    for (const kind of ["listener", "connector", "sender", "receiver"] as const) {
        const ref = example[kind];
        const helper = typeof ref === "string" ? extra?.[kind]?.[ref] : ref;
        if (helper) return { kind, ...helper };
    }
    return undefined;
}
