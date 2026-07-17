import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

/**
 * Root layout — the minimal HTML/body shell shared by every route group.
 * Deliberately carries NO app chrome: the authenticated control panel lives in
 * the (app) group's layout, and the public marketing pages live in the
 * (marketing) group with their own full-bleed layout. Keeping the root minimal
 * is what lets /launch render without the app nav.
 */

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
  themeColor: "#08070d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
