import Sidebar from "@/components/sidebar";
import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className="min-h-full flex flex-col bg-stone-800">
                <Sidebar />
                {/* The sidebar is fixed and 64px wide when collapsed; keep content clear of it. */}
                <div className="flex min-w-0 flex-1 flex-col pl-16">{children}</div>
            </body>
        </html>
    );
}
