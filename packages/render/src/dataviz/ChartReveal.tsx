import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleBand, scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import type { ChartSpec, VideoProps } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Format a value with its unit. Keeps integers clean and trims trailing
    zeros on decimals so "$3B" / "42%" / "1.5M" all read naturally. */
function fmt(v: number, unit?: string): string {
  const n = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const num = Number.isInteger(n) ? String(n) : n.toFixed(1);
  if (!unit) return num;
  // Currency-style units lead; percent/suffix units trail.
  return unit.startsWith("$") ? `${unit}${num}` : `${num}${unit}`;
}

/** Tier 9.5 — animated data-viz reveal (bar / ranking / line). Figures are
    LLM-supplied and fact-checked upstream; an "Illustrative" tag is shown when
    the values couldn't be confirmed. Drawn with d3 scales + Remotion timing. */
export const ChartReveal: React.FC<{ spec: ChartSpec; brand: VideoProps["brand"] }> = ({
  spec,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const points = spec.points.slice(0, 6);
  const maxV = Math.max(1, ...points.map((p) => p.value));
  // Reserve the bottom band for burned-in captions. Long-form captions sit in
  // the bottom ~6.5–19% of the frame; drawing the whole chart into the top
  // `safeH` (all title/plot/axis-label/source math derives from it) lifts the
  // chart's own furniture — category labels and the source/"Illustrative" tag —
  // clear of that band instead of colliding with the caption pill.
  const captionBand = Math.round(height * 0.18);
  const safeH = height - captionBand;
  // Plot box (leave room for title + source + axis labels).
  const pad = { top: Math.round(safeH * 0.26), bottom: Math.round(safeH * 0.14), x: Math.round(width * 0.1) };
  const plotW = width - pad.x * 2;
  const plotH = safeH - pad.top - pad.bottom;

  const titleEnter = spring({ frame, fps, config: { damping: 16 } });
  // Whole-reveal progress drives bar growth / line draw.
  const reveal = interpolate(frame, [6, Math.min(durationInFrames - 8, 6 + 1.6 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const accent = brand.primary;
  const ink = "rgba(255,255,255,0.92)";
  const muted = "rgba(255,255,255,0.55)";

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${brand.secondary} 25%, ${shade(brand.secondary, brand.primary)} 170%)`,
        fontFamily: FONT,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: Math.round(safeH * 0.09),
          left: pad.x,
          right: pad.x,
          color: ink,
          fontSize: Math.round(width * 0.034),
          fontWeight: 800,
          letterSpacing: -0.5,
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * 24}px)`,
          textShadow: "0 2px 18px rgba(0,0,0,0.4)",
        }}
      >
        {spec.title}
      </div>

      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {spec.kind === "line" ? (
          <LineChart
            points={points}
            maxV={maxV}
            reveal={reveal}
            pad={pad}
            plotW={plotW}
            plotH={plotH}
            accent={accent}
            ink={ink}
            muted={muted}
            unit={spec.unit}
            width={width}
          />
        ) : (
          <BarChart
            points={points}
            maxV={maxV}
            reveal={reveal}
            pad={pad}
            plotW={plotW}
            plotH={plotH}
            accent={accent}
            ink={ink}
            muted={muted}
            unit={spec.unit}
            width={width}
            frame={frame}
            fps={fps}
          />
        )}
      </svg>

      {/* Source / illustrative tag */}
      {(spec.source || spec.illustrative) && (
        <div
          style={{
            // Just above the reserved caption band (never over the caption pill).
            position: "absolute",
            bottom: captionBand + Math.round(safeH * 0.02),
            left: pad.x,
            color: muted,
            fontSize: Math.round(width * 0.014),
            fontWeight: 600,
            letterSpacing: 0.3,
            opacity: interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {spec.illustrative ? `Illustrative${spec.source ? ` · ${spec.source}` : ""}` : spec.source}
        </div>
      )}
    </AbsoluteFill>
  );
};

const BarChart: React.FC<{
  points: { label: string; value: number }[];
  maxV: number;
  reveal: number;
  pad: { top: number; bottom: number; x: number };
  plotW: number;
  plotH: number;
  accent: string;
  ink: string;
  muted: string;
  unit?: string;
  width: number;
  frame: number;
  fps: number;
}> = ({ points, maxV, reveal, pad, plotW, plotH, accent, ink, muted, unit, width, frame, fps }) => {
  const x = scaleBand<number>()
    .domain(points.map((_, i) => i))
    .range([0, plotW])
    .padding(0.32);
  const y = scaleLinear().domain([0, maxV]).range([0, plotH]);
  const bw = x.bandwidth();
  const labelSize = Math.round(width * 0.018);
  const valSize = Math.round(width * 0.022);
  return (
    <g transform={`translate(${pad.x},${pad.top})`}>
      {/* baseline */}
      <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke={muted} strokeWidth={2} opacity={0.4} />
      {points.map((p, i) => {
        // Stagger each bar's growth across the reveal window.
        const local = Math.max(0, Math.min(1, (reveal * points.length - i) / 1));
        const ease = spring({ frame: Math.round(local * fps), fps, config: { damping: 18 } });
        const h = y(p.value) * Math.min(1, ease);
        const bx = (x(i) ?? 0);
        const shown = p.value * Math.min(1, ease);
        return (
          <g key={i}>
            <rect
              x={bx}
              y={plotH - h}
              width={bw}
              height={h}
              rx={Math.min(14, bw * 0.18)}
              fill={i === 0 ? accent : `${accent}`}
              opacity={i === 0 ? 1 : 0.55}
            />
            {h > 4 && (
              <text
                x={bx + bw / 2}
                y={plotH - h - valSize * 0.5}
                textAnchor="middle"
                fill={ink}
                fontSize={valSize}
                fontWeight={800}
              >
                {fmt(shown, unit)}
              </text>
            )}
            <text
              x={bx + bw / 2}
              y={plotH + labelSize * 1.6}
              textAnchor="middle"
              fill={muted}
              fontSize={labelSize}
              fontWeight={700}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const LineChart: React.FC<{
  points: { label: string; value: number }[];
  maxV: number;
  reveal: number;
  pad: { top: number; bottom: number; x: number };
  plotW: number;
  plotH: number;
  accent: string;
  ink: string;
  muted: string;
  unit?: string;
  width: number;
}> = ({ points, maxV, reveal, pad, plotW, plotH, accent, ink, muted, unit, width }) => {
  const x = scaleLinear()
    .domain([0, Math.max(1, points.length - 1)])
    .range([0, plotW]);
  const y = scaleLinear().domain([0, maxV]).range([plotH, 0]);
  const path =
    d3line<{ value: number }>()
      .x((_d, i) => x(i))
      .y((d) => y(d.value))
      .curve(curveMonotoneX)(points) ?? "";
  // Draw the stroke by revealing its length.
  const len = 4000; // generous dash length; clamps with pathLength below.
  const labelSize = Math.round(width * 0.017);
  const headIdx = Math.min(points.length - 1, Math.floor(reveal * (points.length - 1) + 1e-6));
  const headP = points[headIdx];
  return (
    <g transform={`translate(${pad.x},${pad.top})`}>
      <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke={muted} strokeWidth={2} opacity={0.4} />
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={Math.round(width * 0.006)}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={len}
        strokeDasharray={len}
        strokeDashoffset={len * (1 - reveal)}
      />
      {/* moving value head */}
      {headP && (
        <text
          x={Math.min(plotW, x(headIdx))}
          y={Math.max(labelSize, y(headP.value) - labelSize)}
          textAnchor="middle"
          fill={ink}
          fontSize={Math.round(width * 0.022)}
          fontWeight={800}
        >
          {fmt(headP.value, unit)}
        </text>
      )}
      {points.map((p, i) => (
        <text
          key={i}
          x={x(i)}
          y={plotH + labelSize * 1.7}
          textAnchor="middle"
          fill={muted}
          fontSize={labelSize}
          fontWeight={700}
        >
          {p.label}
        </text>
      ))}
    </g>
  );
};

/** Blend two brand colours for the background gradient's far stop. */
function shade(a: string, b: string): string {
  const pa = hex(a);
  const pb = hex(b);
  if (!pa || !pb) return a;
  const mix = (i: number) => Math.round(pa[i] * 0.7 + pb[i] * 0.3);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}
function hex(c: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
