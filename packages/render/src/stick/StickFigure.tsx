// Stick Studio — the parametric biped renderer.
//
// Forward kinematics: a Pose (per-segment angles) is turned into joint
// positions from a hip root, then drawn as SVG lines + a head circle. Body
// proportions come from the cast's `build`; identity from colour/line/
// accessory. Returns a <g> (mount inside an <svg>, which StickStage provides).

import React from "react";
import type { Pose } from "./poses";
import type { Build, StickCast } from "./types";

/** Base local-unit segment lengths (figure ≈ 210 units tall at build "normal"). */
const BASE = { torso: 70, headGap: 6, uArm: 38, fArm: 34, thigh: 46, shin: 44 };

/** Per-build proportion multipliers: [torso, arm, leg, head]. */
const BUILD: Record<Build, [number, number, number, number]> = {
  normal: [1, 1, 1, 1],
  tall: [1.18, 1.12, 1.22, 0.95],
  short: [0.85, 0.9, 0.78, 1.05],
  heavy: [0.92, 0.95, 0.85, 1.12],
  lanky: [1.12, 1.3, 1.3, 0.88],
  kid: [0.72, 0.8, 0.7, 1.28],
};

/** Approximate standing height from hip to feet, so any build sits on the
    ground line. */
export function standingFootOffset(cast: StickCast): number {
  const ml = (BUILD[cast.build] ?? BUILD.normal)[2];
  return (BASE.thigh + BASE.shin) * ml * cast.scale;
}

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
  const [mt, ma, ml, mh] = BUILD[cast.build] ?? BUILD.normal;
  const L = {
    torso: BASE.torso * mt,
    headGap: BASE.headGap,
    uArm: BASE.uArm * ma,
    fArm: BASE.fArm * ma,
    thigh: BASE.thigh * ml,
    shin: BASE.shin * ml,
  };
  const headR = cast.headR * mh;

  // Hip at local origin; build the skeleton outward.
  const [nx, ny] = seg(0, 0, 180 + lean, L.torso); // neck
  const [hcx, hcy] = seg(nx, ny, 180 + lean, L.headGap + headR); // head centre

  const [lex, ley] = seg(nx, ny, lSh, L.uArm);
  const [lhx, lhy] = seg(lex, ley, lEl, L.fArm);
  const [rex, rey] = seg(nx, ny, rSh, L.uArm);
  const [rhx, rhy] = seg(rex, rey, rEl, L.fArm);

  const [lkx, lky] = seg(0, 0, lHip, L.thigh);
  const [lfx, lfy] = seg(lkx, lky, lKn, L.shin);
  const [rkx, rky] = seg(0, 0, rHip, L.thigh);
  const [rfx, rfy] = seg(rkx, rky, rKn, L.shin);

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
      <Accessory accessory={cast.accessory} hcx={hcx} hcy={hcy} nx={nx} ny={ny} headR={headR} stroke={stroke} sw={sw} />
      {bone(0, 0, nx, ny, "torso")}
      {bone(nx, ny, lex, ley, "lu")}
      {bone(lex, ley, lhx, lhy, "lf")}
      {bone(nx, ny, rex, rey, "ru")}
      {bone(rex, rey, rhx, rhy, "rf")}
      {bone(0, 0, lkx, lky, "lt")}
      {bone(lkx, lky, lfx, lfy, "ls")}
      {bone(0, 0, rkx, rky, "rt")}
      {bone(rkx, rky, rfx, rfy, "rs")}
      <circle cx={hcx} cy={hcy} r={headR} fill="none" stroke={stroke} strokeWidth={sw} />
    </g>
  );
};

const Accessory: React.FC<{
  accessory: StickCast["accessory"];
  hcx: number;
  hcy: number;
  nx: number;
  ny: number;
  headR: number;
  stroke: string;
  sw: number;
}> = ({ accessory, hcx, hcy, nx, ny, headR, stroke, sw }) => {
  const top = hcy - headR;
  switch (accessory) {
    case "hat":
      return (
        <>
          <rect x={hcx - headR - 3} y={top - 2} width={headR * 2 + 6} height={6} fill={stroke} />
          <rect x={hcx - headR * 0.7} y={top - 16} width={headR * 1.4} height={15} fill={stroke} />
        </>
      );
    case "cap":
      return (
        <>
          <path d={`M ${hcx - headR} ${top + 2} A ${headR} ${headR} 0 0 1 ${hcx + headR} ${top + 2} Z`} fill={stroke} />
          <rect x={hcx + headR - 2} y={top + 1} width={headR * 0.9} height={5} fill={stroke} />
        </>
      );
    case "beanie":
      return <path d={`M ${hcx - headR} ${hcy} A ${headR} ${headR} 0 0 1 ${hcx + headR} ${hcy} Z`} fill={stroke} />;
    case "ponytail":
      return (
        <path
          d={`M ${hcx - headR + 2} ${hcy - 4} q -${headR} 6 -${headR * 0.7} ${headR * 1.6}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      );
    case "antenna":
      return (
        <>
          <line x1={hcx} y1={top} x2={hcx} y2={top - 18} stroke={stroke} strokeWidth={Math.max(3, sw - 4)} />
          <circle cx={hcx} cy={top - 22} r={5} fill={stroke} />
        </>
      );
    case "crown":
      return (
        <path
          d={`M ${hcx - headR} ${top} l ${headR * 0.5} -14 l ${headR * 0.5} 10 l ${headR * 0.5} -10 l ${headR * 0.5} 14 Z`}
          fill={stroke}
        />
      );
    case "tie":
      return (
        <path d={`M ${nx} ${ny + headR * 0.4} l -7 14 l 7 26 l 7 -26 Z`} fill={stroke} />
      );
    case "cape":
      return (
        <path
          d={`M ${nx - 8} ${ny} q -34 60 -18 ${110} l 44 0 q 14 -60 -2 -110 Z`}
          fill={stroke}
          opacity={0.5}
        />
      );
    case "bow":
      return <circle cx={hcx + headR} cy={top + 4} r={7} fill={stroke} />;
    default:
      return null;
  }
};
