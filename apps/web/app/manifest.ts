import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "CTF Army Knife",
        short_name: "Army Knife",
        description: "Self-hosted tools for capture-the-flag challenges.",
        start_url: "/",
        display: "standalone",
        background_color: "#131416",
        theme_color: "#131416",
        icons: [
            { src: "/brand/army-knife-192.png", sizes: "192x192", type: "image/png" },
            { src: "/brand/army-knife-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
