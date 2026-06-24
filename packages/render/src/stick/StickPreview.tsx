// Stick Studio — dev-only preview reel. Cycles the figure through every action
// with a label so the visual quality bar can be eyeballed before any pipeline
// wiring (Phase 0). Also shows a two-character sample scene at the end.

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { ACTION_LIST } from "./poses";
import { StickStage } from "./StickStage";
import { DEFAULT_CAST, type StickScene } from "./types";

const SECONDS_PER_ACTION = 1.8;
const SAMPLE_SECONDS = 3;

/** Total frames for the reel at a given fps (used by Root's calculateMetadata). */
export function stickPreviewDuration(fps: number): number {
  return Math.round((ACTION_LIST.length * SECONDS_PER_ACTION + SAMPLE_SECONDS) * fps);
}

const LABEL: React.CSSProperties = {
  position: "absolute",
  top: 70,
  left: 0,
  right: 0,
  textAlign: "center",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 800,
  fontSize: 64,
  letterSpacing: 2,
  color: "#16140F",
  textTransform: "uppercase",
};

const SETTINGS = ["void", "room", "street", "forest", "office", "cliff"] as const;

export const StickPreview: React.FC = () => {
  const { fps } = useVideoConfig();
  const per = Math.round(SECONDS_PER_ACTION * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8EC" }}>
      {ACTION_LIST.map((action, i) => {
        const scene: StickScene = {
          setting: SETTINGS[i % SETTINGS.length],
          actors: [{ id: "hero", action, x: 0.5, facing: "r" }],
        };
        return (
          <Sequence key={action} from={i * per} durationInFrames={per}>
            <StickStage scene={scene} />
            <div style={LABEL}>{action}</div>
          </Sequence>
        );
      })}

      {/* Two-character sample: a chase, to sanity-check multi-actor + identity. */}
      <Sequence from={ACTION_LIST.length * per} durationInFrames={Math.round(SAMPLE_SECONDS * fps)}>
        <StickStage
          scene={{
            setting: "street",
            fx: ["shake"],
            camera: { zoom: 1.05 },
            actors: [
              { id: "runner", action: "run", x: 0.62, facing: "r" },
              {
                id: "chaser",
                action: "run",
                x: 0.32,
                facing: "r",
                cast: { color: "#C0392B", accessory: "hat" },
              },
            ],
          }}
          cast={DEFAULT_CAST}
        />
        <div style={LABEL}>the chase</div>
      </Sequence>
    </AbsoluteFill>
  );
};
