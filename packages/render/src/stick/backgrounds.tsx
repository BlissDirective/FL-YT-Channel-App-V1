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
  cave: { sky: "#23211D", ground: "#34302A", line: "#46413A", ink: "#3E3A33" },
  ocean: { sky: "#9FD2E0", ground: "#2E7C97", line: "#1F5E73", ink: "#3C90AC" },
  space: { sky: "#11101A", ground: "#1A1828", line: "#2A2740", ink: "#26233A" },
  rooftop: { sky: "#F4C58C", ground: "#3B3A40", line: "#26252A", ink: "#55545C" },
  courtroom: { sky: "#E7DCC4", ground: "#B79A6E", line: "#8A6F49", ink: "#9C8157" },
  hospital: { sky: "#EAF1F2", ground: "#D2E0E2", line: "#A9C2C5", ink: "#BFD4D6" },
  subway: { sky: "#2C2A2E", ground: "#3A373C", line: "#514D54", ink: "#46434A" },
  desert: { sky: "#F3D9A0", ground: "#D8A86A", line: "#A87E48", ink: "#C49559" },
  kitchen: { sky: "#F0EAD9", ground: "#CDBBA0", line: "#A38C6C", ink: "#BBA784" },
  prison: { sky: "#9AA0A2", ground: "#6E7173", line: "#4E5052", ink: "#5C5F61" },
};

export const Background: React.FC<{
  setting: Setting;
  width: number;
  height: number;
  ground: number;
}> = ({ setting, width, height, ground }) => {
  const p = PALETTES[setting];
  const W = width * 3;
  const H = height * 3;
  return (
    <g>
      <rect x={-width} y={-height} width={W} height={H} fill={p.sky} />
      <rect x={-width} y={ground} width={W} height={H} fill={p.ground} />
      <line x1={-width} y1={ground} x2={width * 2} y2={ground} stroke={p.line} strokeWidth={4} />
      <Decor setting={setting} width={width} ground={ground} p={p} />
    </g>
  );
};

const Decor: React.FC<{ setting: Setting; width: number; ground: number; p: Palette }> = ({
  setting,
  width,
  ground,
  p,
}) => {
  switch (setting) {
    case "forest":
      return (
        <g>
          {[0.12, 0.34, 0.62, 0.86].map((fx, i) => {
            const cx = fx * width;
            const h = 220 + (i % 3) * 70;
            const w = 90 + (i % 2) * 30;
            return (
              <g key={i}>
                <rect x={cx - 10} y={ground - h * 0.4} width={20} height={h * 0.4} fill={p.line} />
                <polygon points={`${cx},${ground - h} ${cx - w},${ground - h * 0.35} ${cx + w},${ground - h * 0.35}`} fill={p.ink} />
              </g>
            );
          })}
        </g>
      );
    case "street":
    case "rooftop":
      return (
        <g>
          {[0.06, 0.28, 0.52, 0.78].map((fx, i) => {
            const cx = fx * width;
            const h = 380 + (i % 3) * 160;
            const w = 150 + (i % 2) * 50;
            return <rect key={i} x={cx} y={ground - h} width={w} height={h} fill={p.ink} opacity={0.55} />;
          })}
          {setting === "street" &&
            [0.2, 0.4, 0.6, 0.8].map((fx, i) => (
              <rect key={`d${i}`} x={fx * width} y={ground + 70} width={70} height={10} fill="#E9E4D8" opacity={0.4} />
            ))}
        </g>
      );
    case "room":
    case "courtroom":
      return (
        <g>
          <rect x={width * 0.6} y={ground - 320} width={230} height={210} fill="none" stroke={p.line} strokeWidth={6} />
          <line x1={width * 0.6 + 115} y1={ground - 320} x2={width * 0.6 + 115} y2={ground - 110} stroke={p.line} strokeWidth={4} />
          {setting === "courtroom" && <rect x={width * 0.08} y={ground - 120} width={180} height={120} fill={p.ink} opacity={0.6} />}
        </g>
      );
    case "office":
    case "kitchen":
      return (
        <g>
          <rect x={width * 0.5} y={ground - 70} width={300} height={70} fill={p.ink} />
          <rect x={width * 0.56} y={ground - 190} width={150} height={110} fill="none" stroke={p.line} strokeWidth={6} />
        </g>
      );
    case "cliff":
    case "desert":
      return (
        <g>
          <polygon points={`${0},${ground} ${width * 0.55},${ground} ${width * 0.5},${ground + 400} ${0},${ground + 400}`} fill={p.ink} opacity={0.5} />
          {setting === "desert" ? (
            <circle cx={width * 0.8} cy={ground - 360} r={60} fill="#FBE9B0" />
          ) : (
            <rect x={width * 0.72} y={ground - 260} width={120} height={260} fill={p.ink} opacity={0.4} />
          )}
        </g>
      );
    case "cave":
      return (
        <g>
          <polygon points={`${-width},${ground - 600} ${width * 0.3},${ground - 360} ${width * 0.6},${ground - 480} ${width},${ground - 320} ${width * 2},${ground - 600}`} fill={p.ink} />
          {[0.25, 0.55, 0.82].map((fx, i) => (
            <polygon key={i} points={`${fx * width - 14},${ground - 430} ${fx * width + 14},${ground - 430} ${fx * width},${ground - 360}`} fill={p.line} />
          ))}
        </g>
      );
    case "ocean":
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M ${-width} ${ground - 40 - i * 90} q ${width * 0.5} 30 ${width} 0 t ${width} 0`} fill="none" stroke={p.line} strokeWidth={3} opacity={0.4} />
          ))}
          {[0.2, 0.5, 0.75].map((fx, i) => (
            <circle key={`b${i}`} cx={fx * width} cy={ground - 120 - i * 80} r={8 + i * 3} fill="none" stroke={p.line} strokeWidth={3} opacity={0.5} />
          ))}
        </g>
      );
    case "space":
      return (
        <g>
          {Array.from({ length: 40 }).map((_, i) => {
            const sx = ((i * 137) % 100) / 100;
            const sy = ((i * 79) % 100) / 100;
            return <circle key={i} cx={sx * width} cy={sy * (ground - 60)} r={i % 5 === 0 ? 4 : 2} fill="#EAE6FF" opacity={0.8} />;
          })}
          <circle cx={width * 0.78} cy={ground - 420} r={70} fill="#3A3760" />
          <ellipse cx={width * 0.78} cy={ground - 420} rx={120} ry={26} fill="none" stroke="#6E6AA0" strokeWidth={6} />
        </g>
      );
    case "hospital":
    case "subway":
    case "prison":
      return (
        <g>
          {[0.16, 0.4, 0.64, 0.88].map((fx, i) => (
            <line key={i} x1={fx * width} y1={ground - 360} x2={fx * width} y2={ground} stroke={p.line} strokeWidth={setting === "prison" ? 10 : 5} opacity={0.6} />
          ))}
          {setting === "subway" && <rect x={-width} y={ground - 380} width={width * 3} height={8} fill={p.line} opacity={0.5} />}
          {setting === "hospital" && <rect x={width * 0.1} y={ground - 110} width={150} height={110} fill={p.ink} opacity={0.5} />}
        </g>
      );
    default:
      return null;
  }
};
