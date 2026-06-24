// Stick Studio — procedural backgrounds, drawn in the stage SVG coordinate
// space so they pan/zoom with the camera. Deliberately simple flat shapes — the
// figure is the star.

import React from "react";
import type { Setting } from "./types";

type Palette = { sky: string; ground: string; line: string; ink: string };

const PALETTES: Record<Setting, Palette> = {
  void: { sky: "#1B1A17", ground: "#1B1A17", line: "#2E2C27", ink: "#3A372F" },
  room: { sky: "#EFE7D6", ground: "#D8CBB2", line: "#B7A684", ink: "#C9B996" },
  street: { sky: "#BCACB6", ground: "#4A4742", line: "#2E2C29", ink: "#6E6A63" },
  forest: { sky: "#CFE3C6", ground: "#7E8B5A", line: "#56623A", ink: "#48562F" },
  cliff: { sky: "#F2D9A8", ground: "#9A7B4F", line: "#6E5638", ink: "#7E633F" },
  office: { sky: "#E2E8EC", ground: "#C3CBD1", line: "#94A0A8", ink: "#AEB8BF" },
};

export const Background: React.FC<{
  setting: Setting;
  width: number;
  height: number;
  ground: number;
}> = ({ setting, width, height, ground }) => {
  const p = PALETTES[setting];
  // Oversized rects so panning/zooming never reveals an edge.
  const W = width * 3;
  const H = height * 3;
  return (
    <g>
      <rect x={-width} y={-height} width={W} height={H} fill={p.sky} />
      <rect x={-width} y={ground} width={W} height={H} fill={p.ground} />
      <line x1={-width} y1={ground} x2={width * 2} y2={ground} stroke={p.line} strokeWidth={4} />
      {setting === "forest" && <Forest width={width} ground={ground} ink={p.ink} line={p.line} />}
      {setting === "street" && <Street width={width} ground={ground} ink={p.ink} />}
      {setting === "room" && <Room width={width} ground={ground} ink={p.ink} line={p.line} />}
      {setting === "office" && <Office width={width} ground={ground} ink={p.ink} line={p.line} />}
      {setting === "cliff" && <Cliff width={width} ground={ground} ink={p.ink} />}
    </g>
  );
};

const Forest: React.FC<{ width: number; ground: number; ink: string; line: string }> = ({
  width,
  ground,
  ink,
  line,
}) => (
  <g>
    {[0.12, 0.34, 0.62, 0.86].map((fx, i) => {
      const cx = fx * width;
      const h = 220 + (i % 3) * 70;
      const w = 90 + (i % 2) * 30;
      return (
        <g key={i}>
          <rect x={cx - 10} y={ground - h * 0.4} width={20} height={h * 0.4} fill={line} />
          <polygon
            points={`${cx},${ground - h} ${cx - w},${ground - h * 0.35} ${cx + w},${ground - h * 0.35}`}
            fill={ink}
          />
        </g>
      );
    })}
  </g>
);

const Street: React.FC<{ width: number; ground: number; ink: string }> = ({ width, ground, ink }) => (
  <g>
    {[0.06, 0.28, 0.52, 0.78].map((fx, i) => {
      const cx = fx * width;
      const h = 380 + (i % 3) * 160;
      const w = 150 + (i % 2) * 50;
      return <rect key={i} x={cx} y={ground - h} width={w} height={h} fill={ink} opacity={0.55} />;
    })}
    {/* lane dashes */}
    {[0.2, 0.4, 0.6, 0.8].map((fx, i) => (
      <rect key={`d${i}`} x={fx * width} y={ground + 70} width={70} height={10} fill="#E9E4D8" opacity={0.4} />
    ))}
  </g>
);

const Room: React.FC<{ width: number; ground: number; ink: string; line: string }> = ({
  width,
  ground,
  ink,
  line,
}) => (
  <g>
    <rect x={width * 0.62} y={ground - 320} width={220} height={200} fill="none" stroke={line} strokeWidth={6} />
    <line x1={width * 0.62 + 110} y1={ground - 320} x2={width * 0.62 + 110} y2={ground - 120} stroke={line} strokeWidth={4} />
    <rect x={width * 0.1} y={ground - 90} width={150} height={90} fill={ink} opacity={0.5} />
  </g>
);

const Office: React.FC<{ width: number; ground: number; ink: string; line: string }> = ({
  width,
  ground,
  ink,
  line,
}) => (
  <g>
    <rect x={width * 0.5} y={ground - 70} width={300} height={70} fill={ink} />
    <rect x={width * 0.56} y={ground - 190} width={150} height={110} fill="none" stroke={line} strokeWidth={6} />
    <rect x={width * 0.6} y={ground - 80} width={10} height={80} fill={line} />
  </g>
);

const Cliff: React.FC<{ width: number; ground: number; ink: string }> = ({ width, ground, ink }) => (
  <g>
    <polygon points={`${width * 0.0},${ground} ${width * 0.55},${ground} ${width * 0.5},${ground + 400} ${width * 0.0},${ground + 400}`} fill={ink} opacity={0.5} />
    <rect x={width * 0.7} y={ground - 260} width={120} height={260} fill={ink} opacity={0.4} />
  </g>
);
