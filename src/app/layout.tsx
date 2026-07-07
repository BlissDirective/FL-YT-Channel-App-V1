import type { Metadata, Viewport } from "next";
import { TopNav } from "@/components/shell/top-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
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
        {/* Top safe-area inset keeps the header clear of the mobile status
            bar / notch when installed as a PWA or viewed in a browser whose
            chrome overlays the viewport. */}
        <div className="mx-auto min-h-screen max-w-[1440px] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
          <div className="min-h-[calc(100vh-2.5rem)] rounded-panel bg-surface shadow-card">
            <TopNav />
            {/* Bottom padding below `sm` keeps content clear of the tab bar. */}
            <main className="px-4 pb-24 sm:px-8 sm:pb-8">{children}</main>
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
