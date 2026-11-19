/** Upstream folder an entry comes from, under yml/. */
export type TypeId = "OSBinaries" | "OSLibraries" | "OSScripts" | "OtherMSBinaries" | "HonorableMentions";

/** Command categories, as upstream entries spell them (CategoryList.md). */
export type CategoryId =
    | "ADS"
    | "AWL Bypass"
    | "Compile"
    | "Conceal"
    | "Copy"
    | "Credentials"
    | "Decode"
    | "Download"
    | "Dump"
    | "Encode"
    | "Execute"
    | "Reconnaissance"
    | "Tamper"
    | "UAC Bypass"
    | "Upload";

/** Where a detection reference points: a rule repository, a block rule, an IOC note or a write-up. */
export type DetectionKind = "Sigma" | "Elastic" | "Splunk" | "BlockRule" | "IOC" | "Analysis";

export type Command = {
    /** The command line, with typed placeholders such as `{PATH:.exe}` or `{REMOTEURL}`. */
    command: string;
    description: string;
    usecase: string;
    category: CategoryId;
    /** Upstream's free-text privilege requirement, e.g. "User" or "Local Admin". */
    privileges: string;
    /** MITRE ATT&CK technique, e.g. "T1105" or "T1218.011". */
    mitreId: string;
    /** Windows versions it was seen working on, free text. */
    os: string;
    /** Extra facts such as `Execute: DLL` or `Application: GUI`. */
    tags?: { key: string; value: string }[];
};

export type Entry = {
    /** File name of the binary, script or library, e.g. "Certutil.exe". */
    name: string;
    type: TypeId;
    /** What it is legitimately for. */
    description: string;
    author: string;
    /** YYYY-MM-DD. */
    created: string;
    /** Other names with nearly the same behaviour (e.g. a 64-bit build). */
    aliases?: string[];
    commands: Command[];
    /** Where it usually lives on disk. */
    paths: string[];
    /** Links to code samples. */
    codeSamples?: string[];
    detection?: { kind: DetectionKind; value: string }[];
    /** Links to write-ups and references. */
    resources?: string[];
    acknowledgements?: { person: string; handle?: string }[];
};
