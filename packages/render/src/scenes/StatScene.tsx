import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { tickerValueAt, type SceneSpec } from "@studio/core";

/**
 * VCE V5 — StatScene: renders a stat_callout (static) or number_ticker (counts
 * up with easeOutCubic via the pure tickerValueAt). On-brand motion graphic,
 * near-free. Deterministic given (spec, frame).
 */
export const StatScene: React.FC<{ spec: Extract<SceneSpec, { kind: "stat_callout" | "number_ticker" }> }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [accent, bg, ink] = [spec.palette[0] ?? "#0E7C86", spec.palette[1] ?? "#1B1F24", spec.palette[2] ?? "#E8E6DF"];
  const opacity = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1], { extrapolateRight: "clamp" });

  const display =
    spec.kind === "number_ticker"
      ? `${spec.prefix ?? ""}${Math.round(tickerValueAt(spec.from, spec.to, frame, Math.round(fps * 1.4)))}${spec.suffix ?? ""}`
      : spec.value;
  const label = spec.kind === "number_ticker" ? spec.label : spec.label;

  return (
    <AbsoluteFill style={{ backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, textAlign: "center" }}>
        <p style={{ color: accent, fontSize: 180, fontWeight: 800, lineHeight: 1, fontFamily: "system-ui, sans-serif" }}>
          {display}
        </p>
        {label && (
          <p style={{ color: ink, fontSize: 40, fontWeight: 600, marginTop: 16, fontFamily: "system-ui, sans-serif" }}>
            {label}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
