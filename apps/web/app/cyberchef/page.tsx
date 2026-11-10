import { readFile } from "node:fs/promises";
import path from "node:path";
import CyberChefWorkspace from "@/components/cyberchef-workspace";

export const dynamic = "force-static";
export const metadata = { title: "CyberChef · CTF Army Knife" };

export default async function CyberChefPage() {
    let manifest: { entry?: string };
    try {
        manifest = JSON.parse(
            await readFile(path.join(process.cwd(), "public/tools/cyberchef/manifest.json"), "utf8"),
        );
    } catch {
        throw new Error("CyberChef distribution is missing. Run npm run cyberchef:build before starting Next.js.");
    }
    if (!manifest.entry || !/^\/tools\/cyberchef\/[a-f0-9]{20}\/index\.html$/.test(manifest.entry)) {
        throw new Error("Invalid CyberChef manifest. Run npm run cyberchef:build.");
    }
    return <CyberChefWorkspace entry={manifest.entry} />;
}
