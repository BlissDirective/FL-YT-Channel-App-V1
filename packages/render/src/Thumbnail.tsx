import React from "react";
import { AbsoluteFill, Img, OffthreadVideo } from "remotion";

/** Where the bold headline sits — chosen to avoid the frame's subject (Tier 6). */
export type ThumbPlacement = "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";

export type ThumbnailProps = {
  /** Hero still (preferred) — a frame/snapshot used as the background. */
  imageUrl?: string | null;
  /** Hero clip — its first frame is used as the background when no still. */
  videoUrl?: string | null;
  /** Brand-safe kinetic phrase rendered big over the image. */
  phrase: string;
  /** Headline placement zone (default bottom-left). */
  placement?: ThumbPlacement;
  brand: { primary: string; secondary: string };
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Size the phrase down as it gets longer so it never overflows the frame. */
function phraseSize(phrase: string): number {
  const len = phrase.trim().length;
  if (len <= 12) return 168;
  if (len <= 20) return 140;
  if (len <= 30) return 112;
  if (len <= 44) return 92;
  return 74;
}

/** Map a placement to flex alignment (column flex: justify = vertical). */
function placementStyle(p: ThumbPlacement): {
  justifyContent: "flex-start" | "center" | "flex-end";
  alignItems: "flex-start" | "center" | "flex-end";
  textAlign: "left" | "center" | "right";
} {
  const justifyContent = p.startsWith("top") ? "flex-start" : p === "center" ? "center" : "flex-end";
  const alignItems = p.endsWith("right") ? "flex-end" : p === "center" ? "center" : "flex-start";
  const textAlign = p.endsWith("right") ? "right" : p === "center" ? "center" : "left";
  return { justifyContent, alignItems, textAlign };
}

/**
 * YouTube thumbnail: a striking hero still/frame + a bold, brand-safe kinetic
 * phrase. Rendered as a still by the farm — deterministic text, so no
 * AI-image hallucinated brand names/logos.
 */
export const Thumbnail: React.FC<ThumbnailProps> = ({ imageUrl, videoUrl, phrase, placement = "bottom-left", brand }) => {
  const size = phraseSize(phrase);
  const pos = placementStyle(placement);
  // Kicker bar follows the text's horizontal alignment.
  const kickerMargin =
    pos.textAlign === "right" ? { marginLeft: "auto" } : pos.textAlign === "center" ? { marginLeft: "auto", marginRight: "auto" } : {};
  return (
    <AbsoluteFill style={{ backgroundColor: brand.secondary, fontFamily: FONT }}>
      {imageUrl ? (
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : videoUrl ? (
        <OffthreadVideo
          src={videoUrl}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <AbsoluteFill
          style={{ background: `linear-gradient(135deg, ${brand.secondary}, ${brand.primary})` }}
        />
      )}

      {/* Balanced scrim — darkens top AND bottom so the headline stays legible
          wherever it's placed; strong text shadow/stroke covers the centre. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.12) 32%, rgba(0,0,0,0.12) 66%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: pos.justifyContent,
          alignItems: pos.alignItems,
          padding: "70px 84px",
        }}
      >
        <div style={{ maxWidth: "80%", textAlign: pos.textAlign }}>
          {/* accent kicker bar */}
          <div
            style={{
              width: 150,
              height: 14,
              background: brand.primary,
              borderRadius: 7,
              marginBottom: 28,
              boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
              ...kickerMargin,
            }}
          />
          <p
            style={{
              margin: 0,
              color: "#fff",
              fontWeight: 900,
              fontSize: size,
              lineHeight: 0.96,
              letterSpacing: -2,
              textTransform: "uppercase",
              textShadow: "0 6px 26px rgba(0,0,0,0.8)",
              WebkitTextStroke: "2px rgba(0,0,0,0.35)",
            }}
          >
            {phrase.toUpperCase()}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
