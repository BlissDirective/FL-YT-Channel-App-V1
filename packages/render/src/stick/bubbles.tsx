// Stick Studio — speech/thought bubbles, comic impact bursts, and speed lines.
// All drawn in the stage SVG coordinate space (anchored over actors).

import React from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/** Speech (say) or thought (think) bubble centred at x, sitting above y. */
export const Bubble: React.FC<{
  x: number;
  y: number;
  text: string;
  kind: "say" | "think";
  color?: string;
}> = ({ x, y, text, kind, color = "#16140F" }) => {
  const lines = wrap(text, 18);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const w = Math.min(380, Math.max(120, longest * 15 + 44));
  const h = lines.length * 30 + 26;
  const bx = x - w / 2;
  const by = y - h;
  const textEl = (
    <text x={x} y={by + 32} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={24} fill={color}>
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 30}>
          {ln}
        </tspan>
      ))}
    </text>
  );
  if (kind === "say") {
    return (
      <g>
        <rect x={bx} y={by} width={w} height={h} rx={18} fill="#FFFFFF" stroke={color} strokeWidth={4} />
        <polygon points={`${x - 14},${by + h} ${x + 14},${by + h} ${x},${by + h + 28}`} fill="#FFFFFF" />
        <path d={`M ${x - 14} ${by + h} L ${x} ${by + h + 28} L ${x + 14} ${by + h}`} fill="none" stroke={color} strokeWidth={4} />
        <rect x={x - 12} y={by + h - 3} width={24} height={5} fill="#FFFFFF" />
        {textEl}
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={x} cy={by + h / 2} rx={w / 2} ry={h / 2 + 4} fill="#FFFFFF" stroke={color} strokeWidth={4} />
      <circle cx={x - 8} cy={by + h + 12} r={8} fill="#FFFFFF" stroke={color} strokeWidth={3} />
      <circle cx={x - 20} cy={by + h + 28} r={5} fill="#FFFFFF" stroke={color} strokeWidth={3} />
      {textEl}
    </g>
  );
};

/** Comic starburst with a word ("POW"), pulsing 0..1. */
export const ImpactBurst: React.FC<{ x: number; y: number; word?: string; pulse: number }> = ({
  x,
  y,
  word = "POW",
  pulse,
}) => {
  if (pulse <= 0.01) return null;
  const spikes = 12;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = (i % 2 === 0 ? 1 : 0.55) * 78 * pulse;
    pts.push(`${x + Math.cos(a) * r},${y + Math.sin(a) * r}`);
  }
  return (
    <g>
      <polygon points={pts.join(" ")} fill="#FFE08A" stroke="#16140F" strokeWidth={5} />
      <text x={x} y={y + 12} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={38 * pulse} fill="#16140F">
        {word}
      </text>
    </g>
  );
};

/** Horizontal motion streaks for run/dodge energy. */
export const SpeedLines: React.FC<{ width: number; ground: number; frame: number; dir: 1 | -1 }> = ({
  width,
  ground,
  frame,
  dir,
}) => (
  <g opacity={0.5}>
    {Array.from({ length: 7 }).map((_, i) => {
      const y = ground - 70 - i * 64;
      const off = (frame * 26 + i * 110) % (width + 220);
      const x = dir > 0 ? width + 60 - off : off - 120;
      return <line key={i} x1={x} y1={y} x2={x + dir * 130} y2={y} stroke="#16140F" strokeWidth={4} />;
    })}
  </g>
);
