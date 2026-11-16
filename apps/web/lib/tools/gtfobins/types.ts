/** Privilege contexts an example can run in, from upstream _data/contexts.yml. */
export type ContextId = "unprivileged" | "sudo" | "suid" | "capabilities";

/** What an executable can be abused for, from upstream _data/functions.yml. */
export type FunctionId =
    | "shell"
    | "command"
    | "reverse-shell"
    | "bind-shell"
    | "file-write"
    | "file-read"
    | "upload"
    | "download"
    | "library-load"
    | "privilege-escalation"
    | "inherit";

/** Notes keyed by the boolean flag they explain, e.g. `{ false: "The shell is a dummy REPL." }`. */
export type FlagNotes = Partial<Record<"true" | "false", string>>;

/** A snippet for the attacker's side: a listener, connector, sender or receiver. */
export type Helper = { comment: string; code?: string };

export type FunctionInfo = {
    id: FunctionId;
    label: string;
    description: string;
    /** Explanations for per-example flags, and the helper snippets examples refer to. */
    extra?: {
        tty?: FlagNotes;
        blind?: FlagNotes;
        binary?: FlagNotes;
        listener?: Record<string, Helper>;
        connector?: Record<string, Helper>;
        sender?: Record<string, Helper>;
        receiver?: Record<string, Helper>;
        /** Library-load: how to build a shared library to load. */
        payload?: string;
    };
};

export type ContextInfo = {
    id: ContextId;
    label: string;
    description: string;
    extra?: { environment?: string; shell?: FlagNotes; list?: string };
};

/** Per-context overrides of an example. An empty object means "as written". */
export type ContextDetail = {
    code?: string;
    comment?: string;
    /** SUID: whether the executable goes through the system shell. */
    shell?: boolean;
    /** Capabilities: the ones that must be set. */
    list?: string[];
};

export type Example = {
    code: string;
    comment?: string;
    version?: string;
    /** False when the content gets altered, so it is unsuitable for binary data. */
    binary?: boolean;
    /** True when command output is hidden from the attacker. */
    blind?: boolean;
    /** False when the shell is only a dummy REPL without a TTY. */
    tty?: boolean;
    /** Inherit: the executable these examples come from. */
    from?: string;
    /** Attacker-side snippets: an id from the function's shared table, or a snippet of its own. */
    listener?: string | Helper;
    connector?: string | Helper;
    sender?: string | Helper;
    receiver?: string | Helper;
    contexts: Partial<Record<ContextId, ContextDetail>>;
};

export type Entry = {
    name: string;
    /** Another entry that holds this one's functions. */
    alias?: string;
    comment?: string;
    functions: Partial<Record<FunctionId, Example[]>>;
};
