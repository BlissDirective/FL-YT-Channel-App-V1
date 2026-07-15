import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/sora";
import "./marketing.css";

/**
 * Marketing route group — full-bleed, cinema-dark, no app chrome. Loads the two
 * display faces used by the hero taglines and scopes the marketing design
 * system via the `.marketing` wrapper so none of it leaks into the app.
 */

export const metadata: Metadata = {
  title: "Faceless Studio — Full automation. Zero blind trust.",
  description:
    "Script, voice, visuals, effects, and the final cut — one brief, one crew, your call on every gate. An autonomous studio for faceless YouTube channels.",
  openGraph: {
    title: "Faceless Studio — Full automation. Zero blind trust.",
    description:
      "An agent crew scripts, voices, renders, cuts, and QCs faceless YouTube videos end-to-end. You keep the veto on every gate.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="marketing min-h-screen">{children}</div>;
}
