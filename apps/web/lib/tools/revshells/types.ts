/** The operating systems a command is tagged for, used by the OS filter. */
export type OsTag = "linux" | "windows" | "mac";

/** The command family a payload belongs to (from the upstream CommandType). */
export type CommandType = "ReverseShell" | "BindShell" | "MSFVenom" | "HoaxShell" | "Assembled";

/**
 * One payload. `meta` carries OS tags plus the CommandType tag, exactly as the
 * upstream data ships it. `command` holds `{ip}` / `{port}` / `{shell}`
 * placeholders that getCommand() fills in.
 */
export type Command = {
    name: string;
    command: string;
    meta: string[];
};

/** A listener one-liner, with `{ip}` / `{port}` / `{payload}` / `{type}` placeholders. */
export type Listener = {
    name: string;
    command: string;
};

/** PowerShell payloads that are base64-encoded as a whole, special-cased upstream. */
export type SpecialCommands = Record<string, string>;

/** How the generated command string is encoded before display. */
export type Encoding = "None" | "encodeURL" | "encodeURLDouble" | "Base64";

/** The OS filter options shown above the command list. */
export type OsFilter = "all" | OsTag;
