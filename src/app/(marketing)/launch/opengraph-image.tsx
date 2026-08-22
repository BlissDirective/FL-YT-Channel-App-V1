import { ImageResponse } from "next/og";

/**
 * Open Graph / Twitter share image for /launch (1200×630). File-based Next.js
 * convention — automatically wired as og:image + twitter:image for this route.
 * Studio-light to match the page; the emerald punchline mirrors the hero. Uses
 * the built-in font (only woff2 ships locally, which Satori can't embed).
 */

export const alt = "Faceless Studio — Full automation. Zero blind trust.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#f6f8fb",
          color: "#0e1526",
          position: "relative",
        }}
      >
        {/* brand glows */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            backgroundImage: "radial-gradient(circle, rgba(16,185,129,0.20), rgba(16,185,129,0) 60%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -160,
            width: 560,
            height: 560,
            borderRadius: 9999,
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.16), rgba(139,92,246,0) 60%)",
            display: "flex",
          }}
        />

        {/* eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: "#047857", display: "flex" }} />
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#55617a" }}>
            FACELESS STUDIO — BETA OPENS SEPTEMBER 14
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.02 }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>Full automation.</div>
          <div style={{ fontSize: 96, fontWeight: 700, color: "#047857" }}>Zero blind trust.</div>
        </div>

        {/* sub */}
        <div style={{ marginTop: 34, fontSize: 30, color: "#55617a", maxWidth: 940 }}>
          Script, voice, visuals, music, and the final cut — one brief, one crew,
          your call on every gate.
        </div>
      </div>
    ),
    { ...size },
  );
}
