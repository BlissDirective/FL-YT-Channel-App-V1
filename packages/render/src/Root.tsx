import React from "react";
import { Composition } from "remotion";
import { LongForm, Short, shortDurationSec } from "./VideoComp";
import { FPS, longFormDurationSec, type VideoProps } from "./types";
import { HighlightPreview } from "./highlights/Preview";
import { HighlightOnFootage, HighlightOnFootageVertical } from "./highlights/FootagePreview";

const DEFAULT_PROPS: VideoProps = {
  title: "Sample Video",
  projectName: "Studio",
  brand: { primary: "#F5B829", secondary: "#17150F" },
  beats: [
    {
      idx: 0,
      text: "This is a sample beat.",
      durationSec: 4,
      words: [
        { w: "This", start: 0.1, end: 0.4 },
        { w: "is", start: 0.4, end: 0.6 },
        { w: "a", start: 0.6, end: 0.7 },
        { w: "sample", start: 0.7, end: 1.2 },
        { w: "beat.", start: 1.2, end: 1.7 },
      ],
      voUrl: null,
      shotType: "broll",
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LongForm"
      component={LongForm}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={300}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(longFormDurationSec(props) * FPS),
      })}
    />
    <Composition
      id="Short"
      component={Short}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(shortDurationSec(props) * FPS),
      })}
    />
    {/* Dev-only: eyeball all 8 highlight presets at once. */}
    <Composition
      id="HighlightPreview"
      component={HighlightPreview}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={150}
    />
    {/* Dev-only: highlights over real footage (readability / safe-area). */}
    <Composition
      id="HighlightOnFootage"
      component={HighlightOnFootage}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={250}
    />
    <Composition
      id="HighlightOnFootageVertical"
      component={HighlightOnFootageVertical}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={150}
    />
  </>
);
