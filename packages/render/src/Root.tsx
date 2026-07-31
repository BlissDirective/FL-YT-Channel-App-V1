import React from "react";
import { Composition } from "remotion";
import { LongForm, Short, VerticalShort, shortDurationSec } from "./VideoComp";
import { Thumbnail, type ThumbnailProps } from "./Thumbnail";
import {
  FPS,
  longFormDurationSec,
  verticalShortDurationSec,
  type VideoProps,
} from "./types";
import { HighlightPreview } from "./highlights/Preview";
import { HighlightOnFootage, HighlightOnFootageVertical } from "./highlights/FootagePreview";
import { StickPreview, stickPreviewDuration } from "./stick/StickPreview";
import { StickSheet } from "./stick/StickSheet";
import { StickShowcase, STICK_SHOWCASE_FRAMES } from "./stick/StickShowcase";
import { StickShortSample, STICK_SAMPLE } from "./stick/StickShortSample";
import { ChannelIntro } from "./ChannelIntro";

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
    {/* Full short (native or repurposed segment): all beats, vertical. */}
    <Composition
      id="VerticalShort"
      component={VerticalShort}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(verticalShortDurationSec(props) * FPS),
      })}
    />
    {/* 16:9 thumbnail still — hero frame + brand-safe kinetic phrase. */}
    <Composition
      id="Thumbnail"
      component={Thumbnail}
      fps={FPS}
      width={1280}
      height={720}
      durationInFrames={1}
      defaultProps={
        {
          imageUrl: null,
          videoUrl: null,
          phrase: "ATOMS WIN",
          brand: { primary: "#F5B829", secondary: "#17150F" },
        } satisfies ThumbnailProps
      }
    />
    {/* Dev-only compositions (Phase 7): registered only when
        RENDER_DEV_COMPS=1 — the farm never selects them, and skipping
        registration keeps the production bundle/registry lean. Run
        `RENDER_DEV_COMPS=1 pnpm studio` to eyeball them. */}
    {process.env.RENDER_DEV_COMPS === "1" && (
      <>
    <Composition
      id="ChannelIntroPreview"
      component={ChannelIntro}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={Math.round(13 * FPS)}
      defaultProps={{
        title: "The Silicon Layer",
        tagline: "Investing in the AI economy",
        brand: { primary: "#5BB98C", secondary: "#0F1F18" },
      }}
    />
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
    {/* Stick Studio (Phase 0): cycle every stick-figure action to eyeball the rig. */}
    <Composition
      id="StickPreview"
      component={StickPreview}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={stickPreviewDuration(FPS)}
    />
    {/* Stick Studio (Phase 0): contact sheet of every action for pose tuning. */}
    <Composition
      id="StickSheet"
      component={StickSheet}
      fps={FPS}
      width={1920}
      height={2160}
      durationInFrames={120}
    />
    {/* Stick Studio (Phase 0): showcase of bubbles, fx, moods, builds, settings. */}
    <Composition
      id="StickShowcase"
      component={StickShowcase}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={STICK_SHOWCASE_FRAMES}
    />
    {/* Stick Studio (Phase 1): a real stick short via VerticalShort → BeatScene. */}
    <Composition
      id="StickShortSample"
      component={StickShortSample}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={Math.round(verticalShortDurationSec(STICK_SAMPLE) * FPS)}
      defaultProps={{}}
    />
      </>
    )}
  </>
);
