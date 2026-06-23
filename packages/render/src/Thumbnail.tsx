import React from "react";
import { AbsoluteFill, Img, OffthreadVideo } from "remotion";

export type ThumbnailProps = {
  /** Hero still (preferred) — a frame/snapshot used as the background. */
  imageUrl?: string | null;
  /** Hero clip — its first frame is used as the background when no still. */
  videoUrl?: string | null;
  /** Brand-safe kinetic phrase rendered big over the image. */
  phrase: string;
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

/**
 * YouTube thumbnail: a striking hero still/frame + a bold, brand-safe kinetic
 * phrase. Rendered as a still by the farm — deterministic text, so no
 * AI-image hallucinated brand names/logos.
 */
export const Thumbnail: React.FC<ThumbnailProps> = ({ imageUrl, videoUrl, phrase, brand }) => {
  const size = phraseSize(phrase);
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

      {/* Cinematic scrim for text legibility on any image. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 48%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      <AbsoluteFill style={{ display: "flex", alignItems: "flex-end", padding: "70px 84px" }}>
        <div style={{ maxWidth: "94%" }}>
          {/* accent kicker bar */}
          <div
            style={{
              width: 150,
              height: 14,
              background: brand.primary,
              borderRadius: 7,
              marginBottom: 28,
              boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
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
