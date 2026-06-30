// Stick Studio — composes one StickScene: background + actors + bubbles +
// camera (shot/zoom/pan/move/idle-drift) + fx (shake/flash/impact/speedlines) +
// mood tint + ground shadows + per-scene entrance. BeatScene renders this.

import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTIONS, type Pose } from "./poses";
import { StickFigure, standingFootOffset } from "./StickFigure";
import { Background } from "./backgrounds";
import { Bubble, ImpactBurst, SpeedLines } from "./bubbles";
import {
  DEFAULT_CAST,
  type Mood,
  type PropKey,
  type StickActor,
  type StickCast,
  type StickScene,
} from "./types";

const SHOT_ZOOM = { wide: 1, medium: 1.18, close: 1.5 } as const;

const MOOD_TINT: Record<Mood, { color: string; opacity: number }> = {
  day: { color: "#FFE9B0", opacity: 0.0 },
  night: { color: "#0E1430", opacity: 0.38 },
  danger: { color: "#C0392B", opacity: 0.2 },
  calm: { color: "#2E8B9A", opacity: 0.14 },
  dream: { color: "#6C4AB0", opacity: 0.22 },
  retro: { color: "#C8722E", opacity: 0.18 },
  warning: { color: "#F2B632", opacity: 0.16 },
};

/** Frames of the cut-in entrance (slide + fade) at the start of each scene. */
const ENTER_FRAMES = 6;

export const StickStage: React.FC<{ scene: StickScene; cast?: StickCast }> = ({
  scene,
  cast = DEFAULT_CAST,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const p = durationInFrames > 1 ? frame / durationInFrames : 0; // 0..1 over the beat
  const ground = height * 0.82;
  // Springy cut-in (slight overshoot) instead of a linear ramp.
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 140, mass: 0.6 }, durationInFrames: ENTER_FRAMES + 6 });

  // Camera: shot sets the base zoom; a move (or a gentle idle drift) eases it.
  // Camera moves ease in/out (smoothstep) so they accelerate and settle.
  const pe = (() => {
    const x = Math.min(1, Math.max(0, p));
    return x * x * (3 - 2 * x);
  })();
  const baseZoom = SHOT_ZOOM[scene.shot ?? "wide"];
  const move = scene.camera?.move ?? "none";
  let zoom = (scene.camera?.zoom ?? 1) * baseZoom;
  let panX = scene.camera?.panX ?? 0;
  if (move === "push") zoom *= 1 + 0.14 * pe;
  else if (move === "pull") zoom *= 1.14 - 0.14 * pe;
  else if (move === "panRight") panX += (pe - 0.5) * width * 0.5;
  else if (move === "panLeft") panX -= (pe - 0.5) * width * 0.5;
  else zoom *= 1 + 0.05 * p; // idle drift — a slow push keeps a static scene alive

  const shake = scene.fx?.includes("shake") ? Math.sin(frame * 1.7) * 7 : 0;
  const impactPulse = scene.fx?.includes("impact")
    ? Math.max(0, Math.sin((frame % Math.round(fps * 0.9)) / (fps * 0.9) * Math.PI) * 1.0)
    : 0;
  const mood = scene.mood ? MOOD_TINT[scene.mood] : null;

  // Resolve actor positions + facing. Two-handers auto-spread and face each
  // other when the choreographer didn't pin x/facing.
  const n = scene.actors.length;
  const placed = scene.actors.map((actor, i) => {
    const defaultX = n <= 1 ? 0.5 : 0.2 + (0.6 * i) / (n - 1);
    return { actor, xf: actor.x ?? defaultX };
  });
  const facingFor = (i: number): "l" | "r" => {
    const a = placed[i].actor;
    if (a.facing) return a.facing;
    if (n < 2) return "r";
    const others = placed.filter((_, j) => j !== i).reduce((s, r) => s + r.xf, 0) / (n - 1);
    return placed[i].xf <= others ? "r" : "l"; // turn toward the others
  };
  const focalX = (placed.reduce((s, r) => s + r.xf, 0) / Math.max(1, n)) * width;

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          transform={`translate(${width / 2 + shake}, ${height / 2}) scale(${zoom}) translate(${-width / 2 - panX}, ${-height / 2})`}
        >
          <Background setting={scene.setting} width={width} height={height} ground={ground} />
          {scene.fx?.includes("speedlines") && (
            <SpeedLines width={width} ground={ground} frame={frame} dir={facingFor(0) === "l" ? -1 : 1} />
          )}
          {placed.map(({ actor, xf }, i) => (
            <Actor
              key={actor.id ?? i}
              actor={actor}
              cast={cast}
              t={t}
              x={xf * width}
              ground={ground}
              facing={facingFor(i)}
              enter={enter}
              fps={fps}
              idx={i}
            />
          ))}
          <ImpactBurst x={focalX} y={ground - 130} pulse={impactPulse} />
        </g>
      </svg>
      {mood && mood.opacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: mood.color, opacity: mood.opacity, mixBlendMode: "multiply" }} />
      )}
      {scene.fx?.includes("flash") && <Flash frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

const SPEED_KEYS: (keyof Pose)[] = ["lSh", "lEl", "rSh", "rEl", "lHip", "lKn", "rHip", "rKn", "lean", "rot"];

const Actor: React.FC<{
  actor: StickActor;
  cast: StickCast;
  t: number;
  x: number;
  ground: number;
  facing: "l" | "r";
  enter: number;
  fps: number;
  idx: number;
}> = ({ actor, cast, t, x, ground, facing, enter, fps, idx }) => {
  const c: StickCast = { ...cast, ...(actor.cast ?? {}) };
  const pose = ACTIONS[actor.action](t);
  // Secondary motion: sample the pose one frame back to derive limb velocity →
  // motion blur on fast frames, and vertical velocity → squash/stretch.
  const prev = ACTIONS[actor.action](Math.max(0, t - 1 / fps));
  let speed = 0;
  for (const k of SPEED_KEYS) speed += Math.abs(Number(pose[k]) - Number(prev[k]));
  const blur = Math.min(7, Math.max(0, (speed - 30) * 0.05));
  const bobVel = pose.bob - prev.bob;
  const stretchY = Math.max(0.93, Math.min(1.07, 1 - bobVel * 0.004));
  const hipY = ground - standingFootOffset(c);
  const bubbleY = hipY - 150 * c.scale;
  const dy = (1 - enter) * 24; // slide up into place

  return (
    <g opacity={Math.min(1, enter)} transform={`translate(0, ${dy})`}>
      {/* ground shadow — grounds the figure and adds depth */}
      <ellipse cx={x} cy={ground} rx={38 * c.scale} ry={8 * c.scale} fill="#000000" opacity={0.12} />
      <StickFigure pose={pose} cast={c} facing={facing} x={x} hipY={hipY} blur={blur} stretchY={stretchY} fid={`mb-${idx}`} />
      {actor.prop && actor.prop !== "none" && (
        <Prop kind={actor.prop} x={x} hipY={hipY} ground={ground} facing={facing} color={c.color} />
      )}
      {actor.say && <Bubble x={x} y={bubbleY} text={actor.say} kind="say" color={c.color} />}
      {actor.think && <Bubble x={x} y={bubbleY} text={actor.think} kind="think" color={c.color} />}
    </g>
  );
};

const Prop: React.FC<{
  kind: PropKey;
  x: number;
  hipY: number;
  ground: number;
  facing: "l" | "r";
  color: string;
}> = ({ kind, x, hipY, ground, facing, color }) => {
  const dir = facing === "l" ? -1 : 1;
  const hx = x + dir * 70; // forward hand
  const hy = hipY - 36;
  switch (kind) {
    case "phone":
      return <rect x={hx - 6} y={hy - 14} width={12} height={26} rx={3} fill={color} />;
    case "knife":
      return <line x1={hx} y1={hy} x2={hx + dir * 34} y2={hy - 6} stroke={color} strokeWidth={6} strokeLinecap="round" />;
    case "sword":
      return (
        <g>
          <line x1={hx} y1={hy} x2={hx + dir * 64} y2={hy - 30} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <line x1={hx - dir * 6} y1={hy + 6} x2={hx + dir * 10} y2={hy - 8} stroke={color} strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    case "box":
      return <rect x={x - 28} y={hipY + 40} width={56} height={48} fill="none" stroke={color} strokeWidth={6} />;
    case "bag":
      return <rect x={hx - 16} y={hy} width={32} height={34} rx={4} fill="none" stroke={color} strokeWidth={6} />;
    case "briefcase":
      return (
        <g>
          <rect x={hx - 20} y={hy} width={40} height={30} rx={3} fill="none" stroke={color} strokeWidth={6} />
          <rect x={hx - 8} y={hy - 8} width={16} height={8} fill="none" stroke={color} strokeWidth={4} />
        </g>
      );
    case "book":
      return <rect x={hx - 16} y={hy - 12} width={32} height={24} fill="none" stroke={color} strokeWidth={6} />;
    case "cup":
      return <path d={`M ${hx - 10} ${hy - 12} L ${hx + 10} ${hy - 12} L ${hx + 7} ${hy + 10} L ${hx - 7} ${hy + 10} Z`} fill="none" stroke={color} strokeWidth={5} />;
    case "mic":
      return (
        <g>
          <line x1={hx} y1={hy + 16} x2={hx} y2={hy - 6} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <circle cx={hx} cy={hy - 12} r={9} fill={color} />
        </g>
      );
    case "ball":
      return <circle cx={x + dir * 46} cy={ground - 16} r={16} fill="none" stroke={color} strokeWidth={6} />;
    case "flag":
      return (
        <g>
          <line x1={hx} y1={hy + 20} x2={hx} y2={hy - 56} stroke={color} strokeWidth={5} strokeLinecap="round" />
          <path d={`M ${hx} ${hy - 56} l ${dir * 44} 10 l ${-dir * 44} 14 Z`} fill={color} />
        </g>
      );
    case "torch":
      return (
        <g>
          <line x1={hx} y1={hy} x2={hx + dir * 26} y2={hy - 14} stroke={color} strokeWidth={6} strokeLinecap="round" />
          <circle cx={hx + dir * 30} cy={hy - 18} r={9} fill="#F2B632" />
        </g>
      );
    case "sign":
      return (
        <g>
          <rect x={hx - 2} y={hy - 60} width={5} height={70} fill={color} />
          <rect x={hx - 34} y={hy - 92} width={68} height={40} fill="none" stroke={color} strokeWidth={5} />
        </g>
      );
    default:
      return null;
  }
};

const Flash: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const phase = (frame % Math.round(fps * 1.2)) / (fps * 1.2);
  const opacity = Math.max(0, 0.6 - phase * 4);
  return <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity }} />;
};
