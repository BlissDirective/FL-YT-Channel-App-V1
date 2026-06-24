// Stick Studio — dev showcase of the expanded library: bubbles, impact frames,
// mood tints, character builds/accessories, and new settings. Each Sequence is
// one demo scene (~2s); render a frame inside each to eyeball it.

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { StickStage } from "./StickStage";
import type { Build, StickScene } from "./types";

const SCENES: StickScene[] = [
  // 1) Dialogue — two distinct characters (build + accessory + colour) talking.
  {
    setting: "office",
    shot: "medium",
    actors: [
      { id: "a", action: "idle", x: 0.32, facing: "r", say: "We need to talk.", cast: { build: "tall", accessory: "tie" } },
      { id: "b", action: "shrug", x: 0.68, facing: "l", say: "About what?", cast: { color: "#C0392B", build: "short", accessory: "ponytail" } },
    ],
  },
  // 2) Fight — impact burst + shake + danger mood, in a cave.
  {
    setting: "cave",
    mood: "danger",
    fx: ["impact", "shake"],
    actors: [
      { id: "a", action: "fight", x: 0.4, facing: "r" },
      { id: "b", action: "getHit", x: 0.62, facing: "l", cast: { color: "#2E5E8C" } },
    ],
  },
  // 3) Thought bubble, close shot, in space.
  {
    setting: "space",
    shot: "close",
    camera: { move: "push" },
    actors: [{ id: "a", action: "think", x: 0.5, facing: "r", think: "Where am I?" }],
  },
  // 4) Run with speed lines + warning mood, desert.
  {
    setting: "desert",
    mood: "warning",
    fx: ["speedlines"],
    actors: [{ id: "a", action: "run", x: 0.46, facing: "r", cast: { accessory: "cape" } }],
  },
];

const BUILDS: Build[] = ["kid", "short", "normal", "heavy", "tall", "lanky"];

export const StickShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SCENES.map((scene, i) => (
        <Sequence key={i} from={i * 60} durationInFrames={60}>
          <StickStage scene={scene} />
        </Sequence>
      ))}
      {/* 5) Character builds lineup. */}
      <Sequence from={SCENES.length * 60} durationInFrames={60}>
        <StickStage
          scene={{
            setting: "room",
            actors: BUILDS.map((build, i) => ({
              id: build,
              action: "wave",
              x: 0.1 + i * 0.16,
              facing: "r",
              cast: { build, accessory: (["cap", "beanie", "none", "crown", "antenna", "bow"] as const)[i] },
            })),
          }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export const STICK_SHOWCASE_FRAMES = (SCENES.length + 1) * 60;
