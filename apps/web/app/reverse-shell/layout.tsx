import { toolMetadata } from "@/lib/tools/registry";

export const metadata = toolMetadata("reverse-shell");

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
