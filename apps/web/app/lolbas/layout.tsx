import { toolMetadata } from "@/lib/tools/registry";

export const metadata = toolMetadata("lolbas");

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
