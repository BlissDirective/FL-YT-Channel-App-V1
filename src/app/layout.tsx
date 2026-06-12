import type { Metadata, Viewport } from "next";
import { TopNav } from "@/components/shell/top-nav";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faceless Studio",
  description: "Autonomous faceless YouTube channel studio",
  appleWebApp: {
    capable: true,
    title: "Faceless Studio",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#EDEBE7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto min-h-screen max-w-[1440px] p-3 sm:p-5">
          <div className="min-h-[calc(100vh-2.5rem)] rounded-panel bg-surface shadow-card">
            <TopNav />
            <main className="px-4 pb-8 sm:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
