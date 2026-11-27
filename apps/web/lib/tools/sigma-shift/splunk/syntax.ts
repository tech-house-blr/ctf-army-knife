import vocabulary from "./vocabulary.json";

const escaped = (values: string[]) => values.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|");
const commands = escaped(vocabulary.commands);
const booleans = escaped(vocabulary.booleanOperators);

export const splunkPattern = new RegExp(`#\\s*[^\\n]*|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\|[ \\t]*(?:${commands})\\b|\\b(?:${booleans})\\b|\\b[A-Za-z_][\\w.]*[ \\t]*(?==)|(?:!=|<=|>=|=|<|>)|\\b\\d+(?:\\.\\d+)?\\b`, "gi");

export function classifySplunkToken(token: string) {
    if (token.startsWith("#")) return "code-token-comment";
    if (token.startsWith("\"") || token.startsWith("'")) return "code-token-string";
    if (token.trimStart().startsWith("|")) return "code-token-command";
    if (vocabulary.booleanOperators.includes(token.toUpperCase())) return "code-token-logic";
    if (/^[A-Za-z_][\w.]*[ \t]*$/.test(token)) return "code-token-field";
    if (/^(?:!=|<=|>=|=|<|>)$/.test(token)) return "code-token-operator";
    if (/^\d/.test(token)) return "code-token-number";
    return "code-token-plain";
}
