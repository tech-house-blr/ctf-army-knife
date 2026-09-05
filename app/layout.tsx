import Sidebar from "@/components/sidebar";
import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className="min-h-full flex flex-col bg-stone-800">
                <Sidebar />
                {children}
            </body>
        </html>
    );
}
