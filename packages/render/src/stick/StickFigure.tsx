// Stick Studio — the parametric biped renderer.
//
// Forward kinematics: a Pose (per-segment angles) is turned into joint
// positions from a hip root, then drawn as SVG lines + a head circle. Returns a
// <g> (must be mounted inside an <svg>, which StickStage provides).

import React from "react";
import type { Pose } from "./poses";
import type { StickCast } from "./types";

/** Local-unit segment lengths (figure ≈ 210 units tall). */
const LEN = { torso: 70, headGap: 6, uArm: 38, fArm: 34, thigh: 46, shin: 44 };

/** A segment endpoint from a start point, angle (deg from straight down), len. */
function seg(x: number, y: number, angDeg: number, len: number): [number, number] {
  const r = (angDeg * Math.PI) / 180;
  return [x + len * Math.sin(r), y + len * Math.cos(r)];
}

export const StickFigure: React.FC<{
  pose: Pose;
  cast: StickCast;
  facing: "l" | "r";
  /** Stage coordinates of the hip. */
  x: number;
  hipY: number;
}> = ({ pose, cast, facing, x, hipY }) => {
  const { lean, bob, rot, lSh, lEl, rSh, rEl, lHip, lKn, rHip, rKn } = pose;

  // Hip at local origin; build the skeleton outward.
  const [nx, ny] = seg(0, 0, 180 + lean, LEN.torso); // neck
  const [hcx, hcy] = seg(nx, ny, 180 + lean, LEN.headGap + cast.headR); // head centre

  const [lex, ley] = seg(nx, ny, lSh, LEN.uArm);
  const [lhx, lhy] = seg(lex, ley, lEl, LEN.fArm);
  const [rex, rey] = seg(nx, ny, rSh, LEN.uArm);
  const [rhx, rhy] = seg(rex, rey, rEl, LEN.fArm);

  const [lkx, lky] = seg(0, 0, lHip, LEN.thigh);
  const [lfx, lfy] = seg(lkx, lky, lKn, LEN.shin);
  const [rkx, rky] = seg(0, 0, rHip, LEN.thigh);
  const [rfx, rfy] = seg(rkx, rky, rKn, LEN.shin);

  const stroke = cast.color;
  const sw = cast.line;
  const bone = (x1: number, y1: number, x2: number, y2: number, key: string) => (
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
    />
  );

  const sx = (facing === "l" ? -1 : 1) * cast.scale;

  return (
    <g transform={`translate(${x}, ${hipY + bob}) rotate(${rot}) scale(${sx}, ${cast.scale})`}>
      {bone(0, 0, nx, ny, "torso")}
      {bone(nx, ny, lex, ley, "lu")}
      {bone(lex, ley, lhx, lhy, "lf")}
      {bone(nx, ny, rex, rey, "ru")}
      {bone(rex, rey, rhx, rhy, "rf")}
      {bone(0, 0, lkx, lky, "lt")}
      {bone(lkx, lky, lfx, lfy, "ls")}
      {bone(0, 0, rkx, rky, "rt")}
      {bone(rkx, rky, rfx, rfy, "rs")}
      <circle cx={hcx} cy={hcy} r={cast.headR} fill="none" stroke={stroke} strokeWidth={sw} />
      {cast.accessory === "hat" && (
        <>
          <rect
            x={hcx - cast.headR - 3}
            y={hcy - cast.headR - 2}
            width={cast.headR * 2 + 6}
            height={6}
            fill={stroke}
          />
          <rect
            x={hcx - cast.headR * 0.7}
            y={hcy - cast.headR - 16}
            width={cast.headR * 1.4}
            height={15}
            fill={stroke}
          />
        </>
      )}
      {cast.accessory === "bow" && (
        <circle cx={hcx + cast.headR} cy={hcy - cast.headR + 4} r={7} fill={stroke} />
      )}
    </g>
  );
};
