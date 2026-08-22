import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/sora";
import "./marketing.css";

/**
 * Marketing route group — full-bleed, cinema-dark, no app chrome. Loads the two
 * display faces used by the hero taglines and scopes the marketing design
 * system via the `.marketing` wrapper so none of it leaks into the app.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://faceless.studio");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Faceless Studio — Full automation. Zero blind trust.",
  description:
    "Script, voice, visuals, music, and the final cut — one brief, one crew, your call on every gate. An autonomous studio for YouTube channels. Beta opens September 14.",
  openGraph: {
    title: "Faceless Studio — Full automation. Zero blind trust.",
    description:
      "An agent crew scripts, voices, renders, cuts, and QCs YouTube videos end-to-end. You keep the veto on every gate. Beta opens September 14.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="marketing min-h-screen">{children}</div>;
}
