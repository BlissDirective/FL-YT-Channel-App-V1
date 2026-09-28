import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoProps } from "../types";
import { FONT } from "../scenes";

/**
 * Directed-production overlays (core directed.ts): composited on-screen text
 * (all real text lives here, never in generated plates), the brand sting
 * after the hook, the corner watermark bug, and the loop-safe end beat.
 * Each renders inside its own Sequence, so frame 0 = its start.
 */

type Brand = VideoProps["brand"];

const POSITION: Record<"top" | "center" | "bottom" | "lower-third", React.CSSProperties> = {
  top: { justifyContent: "flex-start", paddingTop: "14%" },
  center: { justifyContent: "center" },
  "lower-third": { justifyContent: "flex-end", paddingBottom: "30%" },
  bottom: { justifyContent: "flex-end", paddingBottom: "18%" },
};

export const LabelOverlay: React.FC<{
  text: string;
  position: "top" | "center" | "bottom" | "lower-third";
  style: "label" | "title" | "caption-bold";
  color?: string;
  brand: Brand;
  vertical: boolean;
}> = ({ text, position, style, color, brand, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Snap on (labels "snap on" in the briefs), soft fade out.
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 260 } });
  const exit = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const accent = color ?? brand.primary;
  const base = vertical ? 1 : 0.8;
  const common: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 900,
    textAlign: "center",
    lineHeight: 1.05,
    maxWidth: "86%",
    transform: `scale(${0.85 + 0.15 * enter})`,
    opacity: enter * exit,
  };
  const look: React.CSSProperties =
    style === "title"
      ? { fontSize: 110 * base, color: "white", textShadow: `0 0 28px ${accent}, 0 6px 18px rgba(0,0,0,0.7)`, letterSpacing: 1 }
      : style === "caption-bold"
        ? { fontSize: 64 * base, color: accent, textShadow: "0 4px 14px rgba(0,0,0,0.85)" }
        : {
            fontSize: 58 * base,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.62)",
            border: `4px solid ${accent}`,
            borderRadius: 18,
            padding: "14px 28px",
            letterSpacing: 2,
            textTransform: "uppercase",
          };
  return (
    <AbsoluteFill style={{ alignItems: "center", ...POSITION[position] }}>
      <div style={{ ...common, ...look }}>{text}</div>
    </AbsoluteFill>
  );
};

/** ~0.5s brand sting: an accent wipe with the channel name, over the picture. */
export const StingOverlay: React.FC<{ projectName: string; brand: Brand; vertical: boolean }> = ({ projectName, brand, vertical }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = durationInFrames > 1 ? frame / (durationInFrames - 1) : 1;
  const wipe = interpolate(p, [0, 0.35, 0.7, 1], [-110, 0, 0, 110]);
  const textOpacity = interpolate(p, [0.2, 0.35, 0.7, 0.85], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: "140%",
          height: vertical ? "13%" : "18%",
          background: `linear-gradient(90deg, transparent, ${brand.primary} 20%, ${brand.primary} 80%, transparent)`,
          transform: `translateX(${wipe}%) skewX(-12deg)`,
          opacity: 0.92,
        }}
      />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: vertical ? 84 : 72,
          letterSpacing: 6,
          color: brand.secondary,
          opacity: textOpacity,
        }}
      >
        {projectName.toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};

/** Corner watermark bug (top-right, above the Shorts UI safe zone). */
export const WatermarkOverlay: React.FC<{ text: string; opacity: number; brand: Brand; vertical: boolean }> = ({ text, opacity, brand, vertical }) => (
  <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "flex-start", padding: vertical ? "7% 6%" : "3.5% 3%", pointerEvents: "none" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: vertical ? 30 : 24,
        letterSpacing: 3,
        color: "white",
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
      }}
    >
      <span style={{ width: vertical ? 16 : 13, height: vertical ? 16 : 13, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", backgroundColor: brand.primary, display: "inline-block" }} />
      {text.toUpperCase()}
    </div>
  </AbsoluteFill>
);

/** Loop-safe end beat: the picture keeps playing (and flows back to frame 1);
    a branded subscribe/CTA band rises over the lower third, then clears
    before the loop point so the seam stays clean. */
export const EndBeatOverlay: React.FC<{ projectName: string; cta?: string; brand: Brand; vertical: boolean }> = ({ projectName, cta, brand, vertical }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15 } });
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = (1 - enter) * 40 + exit * 40;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? "24%" : "9%", pointerEvents: "none" }}>
      <div style={{ transform: `translateY(${y}%)`, opacity: enter * (1 - exit), textAlign: "center", fontFamily: FONT }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: brand.primary,
            color: brand.secondary,
            fontWeight: 900,
            fontSize: vertical ? 46 : 40,
            padding: "14px 36px",
            borderRadius: 999,
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          Subscribe to {projectName}
        </div>
        {cta && (
          <div style={{ marginTop: 16, color: "white", fontWeight: 700, fontSize: vertical ? 34 : 28, textShadow: "0 3px 10px rgba(0,0,0,0.85)" }}>
            {cta}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
