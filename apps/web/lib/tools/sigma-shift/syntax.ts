import { classifySigmaToken, sigmaPattern } from "./sigma/syntax";
import { classifySplunkToken, splunkPattern } from "./splunk/syntax";
import { classifyElasticLuceneToken, elasticLucenePattern } from "./elastic/lucene/syntax";

export type Language = "sigma" | "splunk" | "elastic-lucene";

export const syntaxModules: Record<Language, { pattern: RegExp; classify: (token: string) => string }> = {
    sigma: { pattern: sigmaPattern, classify: classifySigmaToken },
    splunk: { pattern: splunkPattern, classify: classifySplunkToken },
    "elastic-lucene": { pattern: elasticLucenePattern, classify: classifyElasticLuceneToken },
};
