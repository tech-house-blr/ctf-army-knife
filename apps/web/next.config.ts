import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
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
