// Stick Studio — dev contact sheet: every action drawn at once in a grid for
// fast visual tuning. Animated (driven by frame) so it's alive in studio; a
// single still also captures every pose at a representative moment.

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTION_LIST, ACTIONS } from "./poses";
import { StickFigure } from "./StickFigure";
import { DEFAULT_CAST } from "./types";

const COLS = 5;

export const StickSheet: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const rows = Math.ceil(ACTION_LIST.length / COLS);
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8EC" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          width: "100%",
          height: "100%",
        }}
      >
        {ACTION_LIST.map((action) => (
          <Cell key={action} action={action} t={t} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const CELL_W = 384;
const CELL_H = 360;

const Cell: React.FC<{ action: (typeof ACTION_LIST)[number]; t: number }> = ({ action, t }) => {
  const pose = ACTIONS[action](t);
  return (
    <div style={{ position: "relative", borderRight: "1px solid #E7DEC9", borderBottom: "1px solid #E7DEC9" }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${CELL_W} ${CELL_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ground line for reference */}
        <line x1={40} y1={CELL_H * 0.84} x2={CELL_W - 40} y2={CELL_H * 0.84} stroke="#E2D7BE" strokeWidth={3} />
        <StickFigure
          pose={pose}
          cast={{ ...DEFAULT_CAST, scale: 0.78 }}
          facing="r"
          x={CELL_W / 2}
          hipY={CELL_H * 0.84 - 95 * 0.78}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: 1,
          color: "#16140F",
          textTransform: "uppercase",
        }}
      >
        {action}
      </div>
    </div>
  );
};
