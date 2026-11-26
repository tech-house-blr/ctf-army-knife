import vocabulary from "./vocabulary.json";

export const sigmaPattern = new RegExp(`#\\s*[^\\n]*|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|^[ \\t]*[\\w-]+(?=:)|\\|[\\w-]+|\\b(?:${vocabulary.conditionWords.join("|")}|${vocabulary.conditionPrefixes.join("|")}(?:_[\\w]+)?)\\b|\\b(?:${vocabulary.levels.join("|")})\\b|\\b\\d+(?:\\.\\d+)?\\b`, "gi");

export function classifySigmaToken(token: string) {
    if (token.startsWith("#")) return "code-token-comment";
    if (token.startsWith("\"") || token.startsWith("'")) return "code-token-string";
    if (/^\s*[\w-]+$/.test(token)) return "code-token-key";
    if (token.startsWith("|")) return "code-token-modifier";
    const lower = token.toLowerCase();
    if (vocabulary.conditionWords.includes(lower) || vocabulary.conditionPrefixes.some((p) => lower === p || lower.startsWith(`${p}_`))) return "code-token-logic";
    if (vocabulary.levels.includes(lower)) return "code-token-value";
    if (/^\d/.test(token)) return "code-token-number";
    return "code-token-plain";
}
