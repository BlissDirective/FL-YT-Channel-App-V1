// Stick Studio — composes one StickScene: background + actors + camera + fx.
// This is the component BeatScene will render (Phase 1) in place of footage.

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTIONS } from "./poses";
import { StickFigure } from "./StickFigure";
import { Background } from "./backgrounds";
import { DEFAULT_CAST, type PropKey, type StickActor, type StickCast, type StickScene } from "./types";

export const StickStage: React.FC<{ scene: StickScene; cast?: StickCast }> = ({
  scene,
  cast = DEFAULT_CAST,
}) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const ground = height * 0.82;

  const zoom = scene.camera?.zoom ?? 1;
  const panX = scene.camera?.panX ?? 0;
  const shake = scene.fx?.includes("shake") ? Math.sin(frame * 1.7) * 7 : 0;

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <g
          transform={`translate(${width / 2 + shake}, ${height / 2}) scale(${zoom}) translate(${-width / 2 - panX}, ${-height / 2})`}
        >
          <Background setting={scene.setting} width={width} height={height} ground={ground} />
          {scene.actors.map((actor, i) => (
            <Actor key={actor.id ?? i} actor={actor} cast={cast} t={t} width={width} ground={ground} />
          ))}
        </g>
      </svg>
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
  const hipY = ground - 95 * c.scale;
  const facing = actor.facing ?? "r";
  return (
    <g>
      <StickFigure pose={pose} cast={c} facing={facing} x={x} hipY={hipY} />
      {actor.prop && actor.prop !== "none" && (
        <Prop kind={actor.prop} x={x} hipY={hipY} facing={facing} color={c.color} />
      )}
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
  const hx = x + dir * 70; // near the forward hand
  const hy = hipY - 36;
  if (kind === "phone") return <rect x={hx - 6} y={hy - 14} width={12} height={26} rx={3} fill={color} />;
  if (kind === "knife")
    return <line x1={hx} y1={hy} x2={hx + dir * 34} y2={hy - 6} stroke={color} strokeWidth={6} strokeLinecap="round" />;
  if (kind === "box")
    return <rect x={x - 28} y={hipY + 40} width={56} height={48} fill="none" stroke={color} strokeWidth={6} />;
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
  // A quick white pulse every ~1.2s.
  const phase = (frame % Math.round(fps * 1.2)) / (fps * 1.2);
  const opacity = Math.max(0, 0.6 - phase * 4);
  return <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity }} />;
};
