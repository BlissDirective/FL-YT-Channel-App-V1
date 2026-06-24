// Stick Studio — composes one StickScene: background + actors + bubbles +
// camera (shot/zoom/pan/move) + fx (shake/flash/impact/speedlines) + mood tint.
// This is the component BeatScene renders (Phase 1) in place of footage.

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTIONS } from "./poses";
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

export const StickStage: React.FC<{ scene: StickScene; cast?: StickCast }> = ({
  scene,
  cast = DEFAULT_CAST,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const p = durationInFrames > 1 ? frame / durationInFrames : 0; // 0..1 over the beat
  const ground = height * 0.82;

  // Camera: shot sets the base zoom; an optional move eases over the beat.
  const base = SHOT_ZOOM[scene.shot ?? "wide"];
  const move = scene.camera?.move ?? "none";
  let zoom = (scene.camera?.zoom ?? 1) * base;
  let panX = scene.camera?.panX ?? 0;
  if (move === "push") zoom *= 1 + 0.14 * p;
  if (move === "pull") zoom *= 1.14 - 0.14 * p;
  if (move === "panRight") panX += (p - 0.5) * width * 0.5;
  if (move === "panLeft") panX -= (p - 0.5) * width * 0.5;

  const shake = scene.fx?.includes("shake") ? Math.sin(frame * 1.7) * 7 : 0;
  const impactPulse = scene.fx?.includes("impact")
    ? Math.max(0, Math.sin((frame % Math.round(fps * 0.9)) / (fps * 0.9) * Math.PI) * 1.0)
    : 0;
  const mood = scene.mood ? MOOD_TINT[scene.mood] : null;
  const focalX =
    scene.actors.length > 0
      ? (scene.actors.reduce((s, a) => s + (a.x ?? 0.5), 0) / scene.actors.length) * width
      : width / 2;

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          transform={`translate(${width / 2 + shake}, ${height / 2}) scale(${zoom}) translate(${-width / 2 - panX}, ${-height / 2})`}
        >
          <Background setting={scene.setting} width={width} height={height} ground={ground} />
          {scene.fx?.includes("speedlines") && (
            <SpeedLines width={width} ground={ground} frame={frame} dir={(scene.actors[0]?.facing ?? "r") === "l" ? -1 : 1} />
          )}
          {scene.actors.map((actor, i) => (
            <Actor key={actor.id ?? i} actor={actor} cast={cast} t={t} width={width} ground={ground} />
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

const Actor: React.FC<{
  actor: StickActor;
  cast: StickCast;
  t: number;
  width: number;
  ground: number;
}> = ({ actor, cast, t, width, ground }) => {
  const c: StickCast = { ...cast, ...(actor.cast ?? {}) };
  const pose = ACTIONS[actor.action](t);
  const x = (actor.x ?? 0.5) * width;
  const hipY = ground - standingFootOffset(c);
  const facing = actor.facing ?? "r";
  const bubbleY = hipY - 150 * c.scale;
  return (
    <g>
      <StickFigure pose={pose} cast={c} facing={facing} x={x} hipY={hipY} />
      {actor.prop && actor.prop !== "none" && (
        <Prop kind={actor.prop} x={x} hipY={hipY} facing={facing} color={c.color} />
      )}
      {actor.say && <Bubble x={x} y={bubbleY} text={actor.say} kind="say" color={c.color} />}
      {actor.think && <Bubble x={x} y={bubbleY} text={actor.think} kind="think" color={c.color} />}
    </g>
  );
};

const Prop: React.FC<{ kind: PropKey; x: number; hipY: number; facing: "l" | "r"; color: string }> = ({
  kind,
  x,
  hipY,
  facing,
  color,
}) => {
  const dir = facing === "l" ? -1 : 1;
  const hx = x + dir * 70;
  const hy = hipY - 36;
  if (kind === "phone") return <rect x={hx - 6} y={hy - 14} width={12} height={26} rx={3} fill={color} />;
  if (kind === "knife")
    return <line x1={hx} y1={hy} x2={hx + dir * 34} y2={hy - 6} stroke={color} strokeWidth={6} strokeLinecap="round" />;
  if (kind === "box")
    return <rect x={x - 28} y={hipY + 40} width={56} height={48} fill="none" stroke={color} strokeWidth={6} />;
  if (kind === "bag")
    return <rect x={hx - 16} y={hy} width={32} height={34} rx={4} fill="none" stroke={color} strokeWidth={6} />;
  if (kind === "torch")
    return (
      <g>
        <line x1={hx} y1={hy} x2={hx + dir * 26} y2={hy - 14} stroke={color} strokeWidth={6} strokeLinecap="round" />
        <circle cx={hx + dir * 30} cy={hy - 18} r={9} fill="#F2B632" />
      </g>
    );
  if (kind === "sign")
    return (
      <g>
        <rect x={hx - 2} y={hy - 60} width={5} height={70} fill={color} />
        <rect x={hx - 34} y={hy - 92} width={68} height={40} fill="none" stroke={color} strokeWidth={5} />
      </g>
    );
  return null;
};

const Flash: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const phase = (frame % Math.round(fps * 1.2)) / (fps * 1.2);
  const opacity = Math.max(0, 0.6 - phase * 4);
  return <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity }} />;
};
