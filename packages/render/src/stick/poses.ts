// Stick Studio — the pose model + action library.
//
// A Pose is a set of per-segment angles (degrees, measured clockwise from
// straight DOWN, so 0 = pointing down, 180 = pointing up). The figure renderer
// (StickFigure.tsx) turns a Pose into joint positions via forward kinematics.
// Each StickAction is a function of time t (seconds since the action started):
// cyclic actions (walk/run) use sine motion; one-shots (jump/fall) ease 0→1.

import type { StickAction } from "./types";

export type Pose = {
  /** Torso lean (deg; + leans the body to its facing side). */
  lean: number;
  /** Vertical hip offset in local units (− is up). */
  bob: number;
  /** Whole-body rotation about the hip (deg) — for fall/dead/crawl. */
  rot: number;
  /** Arm segment angles (absolute, from down). */
  lSh: number;
  lEl: number;
  rSh: number;
  rEl: number;
  /** Leg segment angles (absolute, from down). */
  lHip: number;
  lKn: number;
  rHip: number;
  rKn: number;
  /** Head tilt (deg). */
  head: number;
  /** Optional IK target for the RIGHT hand, in local hip-space units
      (+x forward toward facing, +y down). When set, the renderer solves the
      right arm (two-bone IK) to reach it instead of using rSh/rEl. */
  reach?: { x: number; y: number };
};

/** Relaxed standing baseline — every action starts from this shape. */
export const NEUTRAL: Pose = {
  lean: 0,
  bob: 0,
  rot: 0,
  lSh: -14,
  lEl: -14,
  rSh: 14,
  rEl: 14,
  lHip: -7,
  lKn: -7,
  rHip: 7,
  rKn: 7,
  head: 0,
};

const TAU = Math.PI * 2;

export type ActionFn = (t: number) => Pose;

const idle: ActionFn = (t) => {
  const b = Math.sin(t * 1.8);
  return { ...NEUTRAL, bob: b * 1.2, lSh: -14 + b, rSh: 14 - b, head: Math.sin(t * 1.5) * 2 };
};

const walk: ActionFn = (t) => {
  const w = t * TAU * 1.1;
  const s = Math.sin(w);
  // Side-view stride: legs swing fore/aft anti-phase around vertical; the rear
  // leg flexes at the knee as it lifts; arms counter-swing, slightly bent.
  return {
    ...NEUTRAL,
    lean: 7,
    bob: -Math.abs(Math.cos(w)) * 5,
    lHip: s * 34,
    rHip: -s * 34,
    lKn: s * 34 + Math.max(0, -s) * 40,
    rKn: -s * 34 + Math.max(0, s) * 40,
    lSh: -s * 26,
    lEl: -s * 26 - 10,
    rSh: s * 26,
    rEl: s * 26 + 10,
  };
};

const run: ActionFn = (t) => {
  const w = t * TAU * 1.9;
  const s = Math.sin(w);
  return {
    ...NEUTRAL,
    lean: 18,
    bob: -Math.abs(Math.cos(w)) * 9 - 6,
    lHip: -4 + s * 40,
    rHip: 4 - s * 40,
    lKn: -4 + Math.max(0, -s) * 58,
    rKn: 4 + Math.max(0, s) * 58,
    lSh: -34 - s * 30,
    lEl: -70 - s * 24,
    rSh: 34 + s * 30,
    rEl: 70 + s * 24,
    head: 8,
  };
};

const jump: ActionFn = (t) => {
  const p = Math.min(t / 0.95, 1);
  const up = Math.sin(p * Math.PI); // 0 → 1 → 0
  const crouch = p < 0.18 ? p / 0.18 : p < 0.32 ? 1 - (p - 0.18) / 0.14 : 0;
  return {
    ...NEUTRAL,
    bob: -up * 130 + crouch * 32,
    lHip: -6 - up * 8 + crouch * 42,
    rHip: 6 + up * 8 + crouch * 42,
    lKn: -6 + crouch * 52 - up * 10,
    rKn: 6 + crouch * 52 + up * 10,
    lSh: -14 - up * 120,
    lEl: -14 - up * 120,
    rSh: 14 + up * 120,
    rEl: 14 + up * 120,
    lean: up * 6,
  };
};

const fall: ActionFn = (t) => {
  const p = Math.min(t / 1.2, 1);
  return {
    ...NEUTRAL,
    rot: p * 88,
    bob: p * 36,
    lSh: -60 + Math.sin(t * 18) * 22,
    rSh: 60 + Math.sin(t * 18 + 1) * 22,
    lEl: -95,
    rEl: 95,
    lHip: -22,
    rHip: 22,
    lKn: -32,
    rKn: 32,
    head: Math.sin(t * 16) * 6,
  };
};

const point: ActionFn = () => ({
  ...NEUTRAL,
  lean: 4,
  rSh: 82,
  rEl: 82,
  lSh: -10,
  lEl: -10,
});

const wave: ActionFn = (t) => {
  const o = Math.sin(t * 8) * 18;
  return { ...NEUTRAL, rSh: 150, rEl: 150 + o, head: 4 };
};

const sit: ActionFn = () => ({
  ...NEUTRAL,
  bob: 46,
  lean: 6,
  lHip: 78,
  rHip: 78,
  lKn: -8,
  rKn: 8,
  lSh: -22,
  rSh: 22,
});

const panic: ActionFn = (t) => {
  const j = Math.sin(t * 26) * 9;
  // Both arms flailing overhead (wide V), body jittering.
  return {
    ...NEUTRAL,
    lSh: 200,
    lEl: 212 + j,
    rSh: 160,
    rEl: 148 - j,
    head: Math.sin(t * 22) * 8,
    bob: -Math.abs(Math.sin(t * 11)) * 5,
  };
};

const celebrate: ActionFn = (t) => {
  const hop = -Math.abs(Math.sin(t * 4)) * 16;
  return {
    ...NEUTRAL,
    bob: hop,
    lSh: 205,
    lEl: 205,
    rSh: 155,
    rEl: 155,
    head: Math.sin(t * 8) * 3,
  };
};

const think: ActionFn = (t) => ({
  ...NEUTRAL,
  lean: 4,
  // Upper arm forward, forearm folded up so the hand rests at the chin.
  rSh: 96,
  rEl: 224,
  head: 7 + Math.sin(t * 1.5) * 2,
  lSh: -10,
  lEl: -10,
});

const fight: ActionFn = (t) => {
  const w = Math.sin(t * 9);
  return {
    ...NEUTRAL,
    lean: 9,
    rSh: 70 + w * 22,
    rEl: 74 + w * 44,
    lSh: -34,
    lEl: -84,
    lHip: -16,
    rHip: 16,
    rKn: 18,
  };
};

const crawl: ActionFn = (t) => {
  const w = t * TAU * 1.2;
  const s = Math.sin(w);
  // Hands-and-knees: torso pitched forward to near-horizontal (no whole-body
  // rotation), arms reaching down to the ground, knees flexed on the ground.
  return {
    ...NEUTRAL,
    lean: -74,
    bob: 30,
    lSh: -6 + s * 14,
    lEl: -6 + s * 14,
    rSh: 6 - s * 14,
    rEl: 6 - s * 14,
    lHip: 18 + s * 12,
    lKn: 92,
    rHip: -18 - s * 12,
    rKn: 92,
    head: 0,
  };
};

const dead: ActionFn = () => ({
  ...NEUTRAL,
  rot: 90,
  bob: 58,
  lSh: -30,
  rSh: 30,
  lEl: -40,
  rEl: 40,
  lHip: -16,
  rHip: 16,
  lKn: -16,
  rKn: 16,
});

const sneak: ActionFn = (t) => {
  const w = t * TAU * 0.8;
  const s = Math.sin(w);
  return {
    ...NEUTRAL,
    lean: 14,
    bob: 18,
    lHip: s * 26,
    rHip: -s * 26,
    lKn: 50 + Math.max(0, -s) * 28,
    rKn: 50 + Math.max(0, s) * 28,
    lSh: -42,
    lEl: -72,
    rSh: 42,
    rEl: 72,
    head: 6,
  };
};

const climb: ActionFn = (t) => {
  const w = t * TAU;
  const s = Math.sin(w);
  return {
    ...NEUTRAL,
    lean: -6,
    lSh: 170 + s * 12,
    lEl: 178 + s * 8,
    rSh: 190 - s * 12,
    rEl: 182 - s * 8,
    lHip: -12 + s * 18,
    lKn: -52,
    rHip: 12 - s * 18,
    rKn: -52,
    head: -4,
  };
};

const swim: ActionFn = (t) => {
  const w = t * TAU * 1.3;
  const s = Math.sin(w);
  return {
    ...NEUTRAL,
    lean: -70,
    bob: 36,
    lSh: -12 + s * 32,
    lEl: -12 + s * 32,
    rSh: 12 - s * 32,
    rEl: 12 - s * 32,
    lHip: 8 + s * 16,
    lKn: 8,
    rHip: -8 - s * 16,
    rKn: -8,
    head: -6,
  };
};

const dance: ActionFn = (t) => {
  const w = t * TAU * 2.2;
  const s = Math.sin(w);
  const s2 = Math.sin(w * 0.5);
  return {
    ...NEUTRAL,
    lean: s2 * 8,
    bob: -Math.abs(s) * 8,
    lSh: 150 + s * 30,
    lEl: 150 + s * 30,
    rSh: 150 - s * 30,
    rEl: 150 - s * 30,
    lHip: -10 + s2 * 14,
    rHip: 10 + s2 * 14,
    head: s * 6,
  };
};

const shrug: ActionFn = () => ({
  ...NEUTRAL,
  bob: -3,
  lSh: -62,
  lEl: -112,
  rSh: 62,
  rEl: 112,
});

const facepalm: ActionFn = () => ({
  ...NEUTRAL,
  lean: 6,
  rSh: 110,
  rEl: 236,
  head: 14,
  lSh: -12,
  lEl: -12,
});

const lookAround: ActionFn = (t) => {
  const s = Math.sin(t * 2.2);
  return { ...NEUTRAL, head: s * 16, rSh: 142, rEl: 120, lSh: -14, lEl: -14, lean: s * 3 };
};

const reach: ActionFn = (t) => {
  const s = Math.sin(t * 3) * 4;
  return {
    ...NEUTRAL,
    lean: 10,
    lSh: -20,
    lEl: -30,
    lHip: -12,
    rHip: 12,
    head: -4,
    // IK target: the right hand reaches forward at ~shoulder height, breathing
    // slightly. Two-bone IK solves the arm to land exactly here (no joint pop).
    reach: { x: 56, y: -56 + s },
  };
};

const carry: ActionFn = (t) => {
  const b = Math.sin(t * 2) * 2;
  return {
    ...NEUTRAL,
    lean: -6,
    lSh: 58,
    lEl: 100,
    rSh: -58,
    rEl: -100,
    bob: 6 + b,
    lHip: -10,
    rHip: 10,
  };
};

const salute: ActionFn = () => ({
  ...NEUTRAL,
  rSh: 150,
  rEl: 116,
  head: 2,
  lSh: -8,
  lEl: -8,
});

const kneel: ActionFn = () => ({
  ...NEUTRAL,
  bob: 40,
  lean: 6,
  lHip: 58,
  lKn: 118,
  rHip: -8,
  rKn: -86,
  lSh: -16,
  rSh: 16,
  head: 4,
});

const type: ActionFn = (t) => {
  const j = Math.sin(t * 16);
  return {
    ...NEUTRAL,
    bob: 44,
    lean: 8,
    lHip: 74,
    rHip: 74,
    lKn: -8,
    rKn: 8,
    lSh: 54,
    lEl: 96 + j * 6,
    rSh: -54,
    rEl: -96 - j * 6,
    head: 6,
  };
};

const push: ActionFn = (t) => {
  const s = Math.sin(t * 3) * 2;
  return {
    ...NEUTRAL,
    lean: 34,
    bob: 6,
    lSh: 20,
    lEl: 18,
    rSh: -20,
    rEl: -18,
    lHip: -28,
    lKn: -20,
    rHip: 24 + s,
    rKn: 30,
    head: 8,
  };
};

const drag: ActionFn = () => ({
  ...NEUTRAL,
  lean: -26,
  bob: 8,
  lSh: 40,
  lEl: 60,
  rSh: -40,
  rEl: -60,
  lHip: 30,
  lKn: 20,
  rHip: -26,
  rKn: -20,
  head: -6,
});

const throw_: ActionFn = (t) => {
  const p = Math.min(t / 0.7, 1);
  const arm = p < 0.5 ? -40 - p * 120 : -100 + (p - 0.5) * 2 * 180;
  return {
    ...NEUTRAL,
    lean: p < 0.5 ? -8 : 14,
    rSh: arm,
    rEl: arm + (p < 0.5 ? -10 : 20),
    lSh: -20,
    lEl: -30,
    lHip: -14,
    rHip: 14,
    head: p < 0.5 ? -4 : 6,
  };
};

const dodge: ActionFn = (t) => {
  const p = Math.min(t / 0.8, 1);
  const lean = Math.sin(p * Math.PI) * -40;
  return {
    ...NEUTRAL,
    lean,
    bob: Math.sin(p * Math.PI) * 14,
    lSh: -50,
    lEl: -80,
    rSh: 50,
    rEl: 80,
    lHip: -20,
    rHip: 20,
    lKn: -30,
    rKn: 30,
    head: lean * 0.3,
  };
};

const getHit: ActionFn = (t) => {
  const p = Math.min(t / 0.7, 1);
  const k = Math.sin(p * Math.PI);
  return {
    ...NEUTRAL,
    lean: -k * 30,
    rot: -k * 6,
    bob: -k * 6,
    lSh: -70 * k - 10,
    lEl: -90 * k,
    rSh: 70 * k + 10,
    rEl: 90 * k,
    head: -k * 14,
    lHip: -14,
    rHip: 14,
  };
};

export const ACTIONS: Record<StickAction, ActionFn> = {
  idle,
  walk,
  run,
  sneak,
  crawl,
  climb,
  swim,
  jump,
  dance,
  point,
  wave,
  think,
  shrug,
  facepalm,
  lookAround,
  reach,
  carry,
  salute,
  celebrate,
  panic,
  kneel,
  sit,
  type,
  push,
  drag,
  throw: throw_,
  fight,
  dodge,
  getHit,
  fall,
  dead,
};

/** Display order for the preview reels (mirrors the StickAction union). */
export const ACTION_LIST: StickAction[] = [
  "idle",
  "walk",
  "run",
  "sneak",
  "crawl",
  "climb",
  "swim",
  "jump",
  "dance",
  "point",
  "wave",
  "think",
  "shrug",
  "facepalm",
  "lookAround",
  "reach",
  "carry",
  "salute",
  "celebrate",
  "panic",
  "kneel",
  "sit",
  "type",
  "push",
  "drag",
  "throw",
  "fight",
  "dodge",
  "getHit",
  "fall",
  "dead",
];
