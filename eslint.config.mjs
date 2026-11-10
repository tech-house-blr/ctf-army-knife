import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // The Next.js app lives in a workspace; the repo-level scripts and tests are linted too.
    { settings: { next: { rootDir: "apps/web/" } } },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/next-env.d.ts",
        "vendor/**",
        ".cache/**",
        "**/.venv/**",
        "**/venv/**",
        "apps/web/public/tools/cyberchef/**",
        "integration/cyberchef/bridge.js",
    ]),
]);

export default eslintConfig;
