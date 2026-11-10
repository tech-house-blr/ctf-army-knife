import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    // Don't let `next dev` write an AGENTS.md (AI-agent instructions) into the app.
    agentRules: false,
    // The dev-only Next.js badge defaults to bottom-left, on top of the rail's controls.
    devIndicators: { position: "bottom-right" },
    // Keep old camelCase tool URLs working after the switch to kebab-case.
    async redirects() {
        return [
            { source: "/cryptogramSolver", destination: "/cryptogram-solver", permanent: true },
            { source: "/gpgDecoder", destination: "/gpg-decoder", permanent: true },
        ];
    },
    async headers() {
        return [
            {
                source: "/tools/cyberchef/:path*",
                headers: [
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                ],
            },
            {
                source: "/tools/cyberchef/:build/:file*.wasm",
                headers: [{ key: "Content-Type", value: "application/wasm" }],
            },
        ];
    },
};

export default nextConfig;
