import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  FPS,
  INTRO_SEC,
  OUTRO_SEC,
  SHORT_TAIL_SEC,
  longFormDurationSec,
  type RenderBeat,
  type VideoProps,
} from "./types";
import { HighlightLayer } from "./highlights/HighlightLayer";
import { HighlightFonts } from "./highlights/fonts";
import { StickStage } from "./stick/StickStage";
import { ChartReveal } from "./dataviz/ChartReveal";
import { LottieInsert } from "./dataviz/LottieInsert";
import {
  CAPTION_MAX_LINES,
  CAPTION_SAFE_WIDTH_FRAC,
  EndCard,
  FONT,
  FallbackCard,
  HERO_RATE,
  IntroSting,
  LowerThird,
  MULTI_IMAGE_MIN_SEC,
  MultiImageSection,
  captionFontSize,
  captionTokenStyle,
  motionStyle,
} from "./scenes";
import { EddVideo } from "./edd/EddVideo";
import { ChannelIntro } from "./ChannelIntro";

/** Long-form 16:9 composition: branded intro sting → beat sequencer
    (visuals cut to VO with word captions) → CTA lower-third at 70% →
    branded end card. When the video has an explicit timeline (an EDD),
    the document drives the cut instead of the beat derivation. */
export const LongForm: React.FC<VideoProps> = (props) => {
  if (props.edd) return <EddVideo {...props} />;
  const total = longFormDurationSec(props);
  // Reusable branded channel open plays first (when configured); everything
  // else shifts back by its length. Song audio, if any, starts with the topic
  // content (after the branded open), not under the logo animation.
  const introLead = props.channelIntro?.seconds ?? 0;
  let cursor = introLead + INTRO_SEC;
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <HighlightFonts />
      {props.channelIntro && (
        <Sequence durationInFrames={Math.round(props.channelIntro.seconds * FPS)}>
          <ChannelIntro title={props.channelIntro.title} tagline={props.channelIntro.tagline} brand={props.brand} />
          {props.channelIntro.musicUrl && (
            <Audio
              src={props.channelIntro.musicUrl}
              volume={(f) => {
                // Quick fade-in, hold, then a short fade-out so the sting hands
                // off cleanly to the first beat's narration.
                const total = Math.round(props.channelIntro!.seconds * FPS);
                const inN = Math.round(0.4 * FPS);
                const outN = Math.round(0.8 * FPS);
                if (f < inN) return Math.max(0, f / inN);
                if (f > total - outN) return Math.max(0, (total - f) / outN);
                return 1;
              }}
            />
          )}
        </Sequence>
      )}
      {/* Song videos: one sung track under the entire piece (after the open). */}
      {props.songUrl && (
        <Sequence from={Math.round(introLead * FPS)}>
          <Audio src={props.songUrl} />
        </Sequence>
      )}
      <Sequence from={Math.round(introLead * FPS)} durationInFrames={Math.round(INTRO_SEC * FPS)}>
        <IntroSting {...props} />
      </Sequence>
      {props.beats.map((beat) => {
        const from = Math.round(cursor * FPS);
        const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
        cursor += Math.max(1, beat.durationSec);
        return (
          <Sequence key={beat.idx} from={from} durationInFrames={dur}>
            <BeatScene beat={beat} brand={props.brand} captionSize={54} captions={props.captions} stickCast={props.stickCast} song={Boolean(props.songUrl)} />
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
    idea #1's "shorts multiplier" (re-cuts assets already paid for).
    Always legacy-driven: the freebie Short re-cuts beat 0 even when the
    long-form renders from an EDD. */
export const Short: React.FC<VideoProps> = (props) => {
  const beat = props.beats[0];
  if (!beat) return <AbsoluteFill style={{ backgroundColor: props.brand.secondary }} />;
  const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <HighlightFonts />
      {props.songUrl && <Audio src={props.songUrl} />}
      <Sequence durationInFrames={dur}>
        <BeatScene beat={beat} brand={props.brand} captionSize={72} vertical captions={props.captions} stickCast={props.stickCast} song={Boolean(props.songUrl)} />
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

/** 9:16 Short across ALL beats in props — used for native shorts and for
    repurposed segments cut from a long-form. Sequences every beat vertically
    with big captions, then a compact CTA tail. Distinct from <Short>, which
    renders only beat 0 as the free long-form byproduct. EDD videos render
    the document instead. */
export const VerticalShort: React.FC<VideoProps> = (props) => {
  if (props.edd) return <EddVideo {...props} />;
  if (props.beats.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: props.brand.secondary }} />;
  }
  let cursor = 0;
  const bodySec = props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0);
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <HighlightFonts />
      {props.beats.map((beat) => {
        const from = Math.round(cursor * FPS);
        const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
        cursor += Math.max(1, beat.durationSec);
        return (
          <Sequence key={beat.idx} from={from} durationInFrames={dur}>
            <BeatScene beat={beat} brand={props.brand} captionSize={72} vertical captions={props.captions} stickCast={props.stickCast} song={Boolean(props.songUrl)} />
          </Sequence>
        );
      })}
      <Sequence
        from={Math.round(bodySec * FPS)}
        durationInFrames={Math.round(SHORT_TAIL_SEC * FPS)}
      >
        <EndCard {...props} compact />
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Scenes ────────────────────────────────────────────────────────────

const BeatScene: React.FC<{
  beat: RenderBeat;
  brand: VideoProps["brand"];
  captionSize: number;
  vertical?: boolean;
  captions?: boolean;
  stickCast?: VideoProps["stickCast"];
  song?: boolean;
}> = ({ beat, brand, captionSize, vertical, captions = true, stickCast, song }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Art-director per-beat camera motion (default: slow zoom-in). Gives cheap
  // stills life and varies the rhythm across beats.
  const motion = motionStyle(beat.motion, frame, durationInFrames);
  return (
    <AbsoluteFill>
      {beat.dataViz ? (
        // Tier 9.5: programmatic data-viz reveal replaces footage for this beat.
        <ChartReveal spec={beat.dataViz} brand={brand} />
      ) : beat.lottie ? (
        // Tier 9.5: Lottie icon/diagram b-roll insert.
        <LottieInsert spec={beat.lottie} brand={brand} />
      ) : beat.stickScene ? (
        // Stick Studio: programmatic performance replaces footage/stills.
        <StickStage scene={beat.stickScene} cast={stickCast} />
      ) : beat.videoUrl && beat.heroHold ? (
        // Hero clip: slow + continuous Ken Burns pan to fill the section.
        <AbsoluteFill style={motion}>
          <Loop
            durationInFrames={Math.max(
              1,
              Math.floor(((beat.videoDurationSec ?? 8) / HERO_RATE) * FPS),
            )}
          >
            <OffthreadVideo
              src={beat.videoUrl}
              muted
              playbackRate={HERO_RATE}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Loop>
        </AbsoluteFill>
      ) : beat.videoUrl ? (
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
      ) : beat.images && beat.images.length >= 2 && beat.durationSec >= MULTI_IMAGE_MIN_SEC ? (
        // Long still section: cross-dissolve through 2–3 stills (Tier 9 #4).
        <MultiImageSection images={beat.images} />
      ) : beat.imageUrl ? (
        <Img
          src={beat.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...motion,
          }}
        />
      ) : (
        // Last-resort fallback when a beat has no usable footage/still (provider
        // failure). NEVER a blank screen: a branded gradient with the beat's
        // headline so the frame still reads as designed content, not broken.
        <FallbackCard text={beat.text} brand={brand} motion={motion} />
      )}
      {/* readability scrim behind captions */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 35%)",
        }}
      />
      {beat.voUrl && <Audio src={beat.voUrl} />}
      {captions && (
        <Captions
          words={beat.words}
          brand={brand}
          size={captionSize}
          vertical={vertical}
          song={song}
        />
      )}
      <HighlightLayer highlights={beat.highlights} brand={brand} vertical={vertical} />
    </AbsoluteFill>
  );
};

/** Word-window captions: a sliding phrase with the spoken word highlighted.

    Responsive (Tier 9 #6a): the phrase auto-fits the frame's safe width and
    wraps to ≤2 lines instead of bleeding off-screen — sizing + pill styling
    shared with the EDD caption pages via scenes.tsx so the two can't drift. */
const Captions: React.FC<{
  words: RenderBeat["words"];
  brand: VideoProps["brand"];
  size: number;
  vertical?: boolean;
  /** Sing-along treatment: big rounded playful type, bright active word, a
      little pop on each new word — tuned for ages 2–5. */
  song?: boolean;
}> = ({ words, brand, size, vertical, song }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
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

  const safeWidth = width * CAPTION_SAFE_WIDTH_FRAC;
  const fontSize = captionFontSize({
    width,
    vertical: Boolean(vertical),
    baseSize: size,
    glyphs: window.reduce((s, w) => s + w.w.length, 0),
    wordCount: window.length,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? "center" : "flex-end",
        alignItems: "center",
        paddingBottom: vertical ? 0 : 70,
        paddingLeft: width * ((1 - CAPTION_SAFE_WIDTH_FRAC) / 2),
        paddingRight: width * ((1 - CAPTION_SAFE_WIDTH_FRAC) / 2),
      }}
    >
      <div
        style={{
          maxWidth: safeWidth,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          lineHeight: 1.2,
          maxHeight: fontSize * 1.2 * CAPTION_MAX_LINES,
          overflow: "hidden",
        }}
      >
        {window.map((w, i) => {
          const isActive = winStart + i === active;
          if (song) {
            // Bounce the active word in as it lands (scale 1.35 → 1, ~0.16s).
            const since = Math.max(0, t - w.start);
            const pop = isActive ? 1 + 0.35 * Math.max(0, 1 - since / 0.16) : 1;
            // Kid palette: warm cream idle, bright brand fill on the sung word.
            const bright = brand.primary || "#F7B32B";
            return (
              <span
                key={winStart + i}
                style={{
                  display: "inline-block",
                  margin: "0 0.18em",
                  fontFamily:
                    "'Baloo 2','Comic Sans MS','Chalkboard SE','Fredoka',ui-rounded,'Segoe UI',sans-serif",
                  fontWeight: 800,
                  fontSize: fontSize * 1.12,
                  letterSpacing: "0.01em",
                  color: isActive ? bright : "#FFF7E6",
                  transform: `scale(${pop}) translateY(${isActive ? -2 : 0}px)`,
                  WebkitTextStroke: `${Math.max(3, fontSize * 0.05)}px #2A2015`,
                  paintOrder: "stroke fill",
                  textShadow: isActive
                    ? `0 6px 0 rgba(42,32,21,0.35), 0 0 ${fontSize * 0.4}px ${bright}66`
                    : "0 5px 0 rgba(42,32,21,0.3)",
                  transition: "color 60ms linear",
                }}
              >
                {w.w}
              </span>
            );
          }
          return (
            <span key={winStart + i} style={captionTokenStyle(isActive, brand, fontSize)}>
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
