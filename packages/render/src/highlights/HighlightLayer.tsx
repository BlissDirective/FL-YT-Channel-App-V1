import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Highlight } from "../types";
import { PRESETS, type HighlightRenderProps } from "./presets";

/**
 * Renders a beat's curated highlights as timed, animated overlays on top of
 * the visuals + captions. One <Sequence> per highlight, placed at its
 * beat-local start with a hold long enough to read; a short exit fade keeps
 * the cut clean. Sits at the top of the beat's z-stack.
 */
export const HighlightLayer: React.FC<{
  highlights?: Highlight[];
  brand: { primary: string; secondary: string };
  vertical?: boolean;
}> = ({ highlights, brand, vertical }) => {
  const { fps } = useVideoConfig();
  if (!highlights || highlights.length === 0) return null;
  const baseSize = vertical ? 104 : 80;
  return (
    <>
      {highlights.map((hl) => {
        const from = Math.max(0, Math.round((hl.startMs / 1000) * fps));
        const dur = Math.max(1, Math.round(((hl.endMs - hl.startMs) / 1000) * fps));
        return (
          <Sequence key={hl.id} from={from} durationInFrames={dur} layout="none">
            <HighlightItem
              hl={hl}
              brand={brand}
              vertical={vertical}
              baseSize={baseSize}
              holdFrames={dur}
            />
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Wraps a preset with a uniform exit fade so every style leaves cleanly.
 * `holdFrames` is passed explicitly because useVideoConfig().durationInFrames
 * reports the composition length, not this Sequence's.
 */
const HighlightItem: React.FC<HighlightRenderProps & { holdFrames: number }> = ({
  holdFrames,
  ...props
}) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [holdFrames - 8, holdFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const Preset = PRESETS[props.hl.stylePreset] ?? PRESETS["word-pop"];
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Preset {...props} />
    </AbsoluteFill>
  );
};
