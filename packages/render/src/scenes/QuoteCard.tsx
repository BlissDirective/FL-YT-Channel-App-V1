import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneSpec } from "@studio/core";

/**
 * VCE V5 — QuoteCard scene. Renders a featured quote as an on-brand motion-
 * graphic card (near-free vs generating footage). Consumes the authored
 * quote_card SceneSpec. Deterministic given (spec, frame) so it golden-tests.
 */
export const QuoteCard: React.FC<{ spec: Extract<SceneSpec, { kind: "quote_card" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [bg, ink, accent] = [spec.palette[1] ?? "#1B1F24", spec.palette[2] ?? "#E8E6DF", spec.palette[0] ?? "#0E7C86"];
  const inFrames = Math.round(fps * 0.5);
  const opacity = interpolate(frame, [0, inFrames], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, inFrames], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: bg, justifyContent: "center", alignItems: "center", padding: "8%" }}>
      <div style={{ opacity, transform: `translateY(${rise}px)`, maxWidth: "80%", textAlign: "center" }}>
        <div style={{ width: 64, height: 6, backgroundColor: accent, margin: "0 auto 32px" }} />
        <p style={{ color: ink, fontSize: 56, fontWeight: 700, lineHeight: 1.25, fontFamily: "system-ui, sans-serif" }}>
          “{spec.quote}”
        </p>
        {spec.attribution && (
          <p style={{ color: accent, fontSize: 28, marginTop: 28, fontWeight: 600, fontFamily: "system-ui, sans-serif" }}>
            — {spec.attribution}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
