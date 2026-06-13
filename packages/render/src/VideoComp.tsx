import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  FPS,
  INTRO_SEC,
  OUTRO_SEC,
  longFormDurationSec,
  type RenderBeat,
  type VideoProps,
} from "./types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Long-form 16:9 composition: branded intro sting → beat sequencer
    (visuals cut to VO with word captions) → CTA lower-third at 70% →
    branded end card. */
export const LongForm: React.FC<VideoProps> = (props) => {
  const total = longFormDurationSec(props);
  let cursor = INTRO_SEC;
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <Sequence durationInFrames={Math.round(INTRO_SEC * FPS)}>
        <IntroSting {...props} />
      </Sequence>
      {props.beats.map((beat) => {
        const from = Math.round(cursor * FPS);
        const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
        cursor += Math.max(1, beat.durationSec);
        return (
          <Sequence key={beat.idx} from={from} durationInFrames={dur}>
            <BeatScene beat={beat} brand={props.brand} captionSize={54} />
          </Sequence>
        );
      })}
      <Sequence
        from={Math.round(total * 0.7 * FPS)}
        durationInFrames={Math.round(5 * FPS)}
      >
        <LowerThird brand={props.brand} />
      </Sequence>
      <Sequence
        from={Math.round((total - OUTRO_SEC) * FPS)}
        durationInFrames={Math.round(OUTRO_SEC * FPS)}
      >
        <EndCard {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** 9:16 Short: the hook beat with big centered captions + a CTA tail —
    idea #1's "shorts multiplier" (re-cuts assets already paid for). */
export const Short: React.FC<VideoProps> = (props) => {
  const beat = props.beats[0];
  if (!beat) return <AbsoluteFill style={{ backgroundColor: props.brand.secondary }} />;
  const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <Sequence durationInFrames={dur}>
        <BeatScene beat={beat} brand={props.brand} captionSize={72} vertical />
      </Sequence>
      <Sequence from={dur} durationInFrames={Math.round(1.5 * FPS)}>
        <EndCard {...props} compact />
      </Sequence>
    </AbsoluteFill>
  );
};

export function shortDurationSec(props: VideoProps): number {
  return Math.max(1, props.beats[0]?.durationSec ?? 1) + 1.5;
}

// ── Scenes ────────────────────────────────────────────────────────────

const BeatScene: React.FC<{
  beat: RenderBeat;
  brand: VideoProps["brand"];
  captionSize: number;
  vertical?: boolean;
}> = ({ beat, brand, captionSize, vertical }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const kenBurns = interpolate(frame, [0, durationInFrames], [1.02, 1.12]);
  return (
    <AbsoluteFill>
      {beat.videoUrl ? (
        <Loop
          durationInFrames={Math.max(
            1,
            Math.floor((beat.videoDurationSec ?? 10) * FPS),
          )}
        >
          <OffthreadVideo
            src={beat.videoUrl}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Loop>
      ) : beat.imageUrl ? (
        <Img
          src={beat.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${kenBurns})`,
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.secondary}, ${brand.primary})`,
          }}
        />
      )}
      {/* readability scrim behind captions */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 35%)",
        }}
      />
      {beat.voUrl && <Audio src={beat.voUrl} />}
      <Captions
        words={beat.words}
        brand={brand}
        size={captionSize}
        vertical={vertical}
      />
    </AbsoluteFill>
  );
};

/** Word-window captions: a sliding phrase with the spoken word highlighted. */
const Captions: React.FC<{
  words: RenderBeat["words"];
  brand: VideoProps["brand"];
  size: number;
  vertical?: boolean;
}> = ({ words, brand, size, vertical }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (words.length === 0) return null;
  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].start) active = i;
    else break;
  }
  if (active < 0) return null;
  const winStart = Math.max(0, active - (active % 5));
  const window = words.slice(winStart, winStart + 5);
  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? "center" : "flex-end",
        alignItems: "center",
        paddingBottom: vertical ? 0 : 70,
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <div style={{ textAlign: "center", lineHeight: 1.25 }}>
        {window.map((w, i) => {
          const isActive = winStart + i === active;
          return (
            <span
              key={winStart + i}
              style={{
                fontSize: size,
                fontWeight: 800,
                color: isActive ? brand.secondary : "white",
                backgroundColor: isActive ? brand.primary : "transparent",
                borderRadius: 12,
                padding: "2px 10px",
                margin: "0 2px",
                textShadow: isActive ? "none" : "0 2px 12px rgba(0,0,0,0.9)",
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const IntroSting: React.FC<VideoProps> = ({ title, projectName, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const fadeOut = interpolate(frame, [INTRO_SEC * FPS - 12, INTRO_SEC * FPS], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.secondary} 30%, ${brand.primary} 160%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * 60}px)`,
          opacity: enter,
          textAlign: "center",
          padding: "0 120px",
        }}
      >
        <div
          style={{
            color: brand.primary,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          {projectName}
        </div>
        <div style={{ color: "white", fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LowerThird: React.FC<{ brand: VideoProps["brand"] }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start" }}>
      <div
        style={{
          margin: 60,
          marginBottom: 200,
          transform: `translateX(${(1 - enter + exit) * -120}%)`,
          backgroundColor: brand.primary,
          color: brand.secondary,
          fontSize: 32,
          fontWeight: 800,
          padding: "14px 28px",
          borderRadius: 999,
        }}
      >
        Enjoying this? Subscribe — it&apos;s free
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<VideoProps & { compact?: boolean }> = ({
  projectName,
  brand,
  compact,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.secondary,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ transform: `scale(${enter})`, textAlign: "center" }}>
        <div
          style={{
            color: brand.secondary,
            backgroundColor: brand.primary,
            display: "inline-block",
            fontSize: compact ? 44 : 56,
            fontWeight: 800,
            padding: "18px 42px",
            borderRadius: 999,
          }}
        >
          Subscribe to {projectName}
        </div>
        {!compact && (
          <div style={{ color: "white", fontSize: 30, marginTop: 28, opacity: 0.85 }}>
            New videos every week
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
