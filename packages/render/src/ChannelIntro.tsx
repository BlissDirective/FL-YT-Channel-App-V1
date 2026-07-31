import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./scenes";

/**
 * Reusable branded channel intro — a modern motion-graphics "hero" open that
 * plays before the topic sting on every video of a channel that opts in
 * (projects.brand_kit.heroIntro). It is fully procedural (no uploaded asset):
 * driven by the channel name + brand colors, so one component brands every
 * channel. The visual language is a silicon/photonic circuit — a dark board,
 * a drifting grid, glowing nodes, and light "data beams" sweeping across —
 * which reads premium and on-theme for a hardware/AI-economy channel while
 * staying generic enough for any brand.
 *
 * Timeline (relative to the Sequence's own duration, so it scales to whatever
 * `seconds` the channel configured, nominally 10-20s):
 *   • board + grid establish, beams begin sweeping
 *   • "WELCOME TO" kicker rises
 *   • the channel wordmark reveals (per-word spring + glow)
 *   • tagline reveals, an accent beam draws beneath the wordmark
 *   • a calm hold with pulsing nodes, then a clean fade-out handoff
 */
export const ChannelIntro: React.FC<{
  title: string;
  tagline?: string;
  brand: { primary: string; secondary: string };
}> = ({ title, tagline, brand }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const D = durationInFrames;
  const p = (f: number) => f / D; // 0..1 progress
  const prog = p(frame);

  // Whole-piece fade in/out so the hand-off to the topic sting is clean.
  const fadeIn = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [D - Math.round(0.6 * fps), D], [1, 0], { extrapolateLeft: "clamp" });
  const master = fadeIn * fadeOut;

  // Slow cinematic push-in across the whole open.
  const zoom = interpolate(prog, [0, 1], [1.06, 1.0]);

  // ── Grid (drifting circuit board) ─────────────────────────────────────
  const cell = Math.round(height / 9);
  const drift = interpolate(prog, [0, 1], [0, -cell]); // gentle diagonal drift
  const gridOpacity = interpolate(frame, [0, Math.round(0.8 * fps)], [0, 0.22], { extrapolateRight: "clamp" });

  // ── Light "data beams" — horizontal sweeps at a few rows, staggered ────
  const beamRows = [0.28, 0.5, 0.72, 0.86];
  const beams = beamRows.map((yFrac, i) => {
    const start = Math.round((0.1 + i * 0.22) * fps);
    const span = Math.round(2.2 * fps);
    const t = interpolate(frame, [start, start + span], [-0.35, 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { yFrac, x: t, key: i };
  });

  // ── Pulsing nodes at grid intersections ───────────────────────────────
  const nodes = [
    [0.16, 0.3],
    [0.34, 0.66],
    [0.7, 0.24],
    [0.83, 0.6],
    [0.5, 0.82],
    [0.22, 0.78],
  ] as const;

  // ── Kicker "WELCOME TO" ───────────────────────────────────────────────
  const kickerIn = spring({ frame: frame - Math.round(0.9 * fps), fps, config: { damping: 16 } });
  const kickerY = interpolate(kickerIn, [0, 1], [18, 0]);

  // ── Wordmark: per-word spring reveal ──────────────────────────────────
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const wordStart = Math.round(1.5 * fps);
  const wordStagger = Math.round(0.18 * fps);

  // ── Accent beam under the wordmark (draws L→R) ────────────────────────
  const underlineStart = wordStart + words.length * wordStagger + Math.round(0.2 * fps);
  const underline = interpolate(
    frame,
    [underlineStart, underlineStart + Math.round(0.9 * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Tagline ───────────────────────────────────────────────────────────
  const taglineIn = interpolate(
    frame,
    [underlineStart, underlineStart + Math.round(0.7 * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const wordmarkSize = Math.round(width * 0.072);
  const green = brand.primary;
  const dark = brand.secondary;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05090C", fontFamily: FONT, opacity: master }}>
      {/* Deep board gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 120% at 50% 42%, ${dark} 0%, #05090C 70%)`,
          transform: `scale(${zoom})`,
        }}
      />

      {/* Drifting circuit grid */}
      <AbsoluteFill style={{ opacity: gridOpacity, transform: `scale(${zoom}) translate(${drift}px, ${drift}px)` }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="mmgrid" width={cell} height={cell} patternUnits="userSpaceOnUse">
              <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={green} strokeWidth={1} />
            </pattern>
          </defs>
          <rect width="140%" height="140%" fill="url(#mmgrid)" />
        </svg>
      </AbsoluteFill>

      {/* Light data beams */}
      {beams.map((b) => (
        <div
          key={b.key}
          style={{
            position: "absolute",
            top: `${b.yFrac * 100}%`,
            left: 0,
            width: "100%",
            height: 2,
            transform: `translateX(${(b.x - 1) * 100}%)`,
            background: `linear-gradient(90deg, transparent, ${green}00, ${green}, #EAFBF2, ${green}, ${green}00, transparent)`,
            boxShadow: `0 0 18px 2px ${green}`,
            opacity: 0.9,
          }}
        />
      ))}

      {/* Pulsing nodes */}
      {nodes.map(([nx, ny], i) => {
        const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * 3 + i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${nx * 100}%`,
              top: `${ny * 100}%`,
              width: 8,
              height: 8,
              marginLeft: -4,
              marginTop: -4,
              borderRadius: "50%",
              background: green,
              boxShadow: `0 0 ${8 + pulse * 14}px ${1 + pulse * 3}px ${green}`,
              opacity: 0.35 + pulse * 0.5,
            }}
          />
        );
      })}

      {/* Center lockup */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 6%" }}>
          {/* Kicker */}
          <div
            style={{
              color: "#CFE9DC",
              fontSize: Math.round(width * 0.018),
              letterSpacing: Math.round(width * 0.012),
              fontWeight: 700,
              opacity: kickerIn,
              transform: `translateY(${kickerY}px)`,
              marginBottom: Math.round(height * 0.03),
              marginLeft: Math.round(width * 0.012), // optical balance for letter-spacing
            }}
          >
            WELCOME TO
          </div>

          {/* Wordmark */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${Math.round(wordmarkSize * 0.28)}px`, justifyContent: "center" }}>
            {words.map((w, i) => {
              const s = spring({ frame: frame - (wordStart + i * wordStagger), fps, config: { damping: 13, stiffness: 120 } });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    fontSize: wordmarkSize,
                    lineHeight: 1.02,
                    fontWeight: 900,
                    letterSpacing: -1,
                    color: green,
                    opacity: s,
                    transform: `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`,
                    textShadow: `0 0 ${Math.round(wordmarkSize * 0.35)}px ${green}66, 0 2px 2px #00000080`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>

          {/* Accent beam under the wordmark */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: Math.round(height * 0.028) }}>
            <div
              style={{
                width: `${underline * 46}%`,
                height: 4,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${green}, #EAFBF2)`,
                boxShadow: `0 0 16px 1px ${green}`,
              }}
            />
          </div>

          {/* Tagline */}
          {tagline ? (
            <div
              style={{
                marginTop: Math.round(height * 0.035),
                color: "#EAF4EE",
                fontSize: Math.round(width * 0.02),
                fontWeight: 500,
                letterSpacing: 0.5,
                opacity: taglineIn,
                transform: `translateY(${(1 - taglineIn) * 12}px)`,
              }}
            >
              {tagline}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* Subtle vignette for depth */}
      <AbsoluteFill
        style={{ boxShadow: "inset 0 0 300px 60px #000000", pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
};
