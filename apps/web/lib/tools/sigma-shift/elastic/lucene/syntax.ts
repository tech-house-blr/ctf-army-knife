import vocabulary from "./vocabulary.json";

export const elasticLucenePattern = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:AND|OR|NOT|TO)\b|(?:>=|<=|!=|>|<|=)|\b\d+(?:\.\d+)?\b/gi;

export function classifyElasticLuceneToken(token: string) {
    if (token.startsWith("\"") || token.startsWith("'")) return "code-token-string";
    if (vocabulary.booleanOperators.includes(token.toUpperCase())) return "code-token-logic";
    if (/^(?:>=|<=|!=|>|<|=)$/.test(token)) return "code-token-operator";
    if (/^\d/.test(token)) return "code-token-number";
    return "code-token-plain";
}
