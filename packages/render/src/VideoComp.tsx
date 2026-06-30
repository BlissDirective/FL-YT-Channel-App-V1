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
  SHORT_TAIL_SEC,
  longFormDurationSec,
  verticalShortDurationSec,
  type RenderBeat,
  type VideoProps,
} from "./types";
import { HighlightLayer } from "./highlights/HighlightLayer";
import { HighlightFonts } from "./highlights/fonts";
import { StickStage } from "./stick/StickStage";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Hero-hold playback rate: a short premium clip is slowed (and Ken-Burns
    panned) so it stretches cinematically over a long section instead of
    looping obviously. */
const HERO_RATE = 0.5;

/** Long-form 16:9 composition: branded intro sting → beat sequencer
    (visuals cut to VO with word captions) → CTA lower-third at 70% →
    branded end card. */
export const LongForm: React.FC<VideoProps> = (props) => {
  const total = longFormDurationSec(props);
  let cursor = INTRO_SEC;
  return (
    <AbsoluteFill style={{ backgroundColor: props.brand.secondary, fontFamily: FONT }}>
      <HighlightFonts />
      <Sequence durationInFrames={Math.round(INTRO_SEC * FPS)}>
        <IntroSting {...props} />
      </Sequence>
      {props.beats.map((beat) => {
        const from = Math.round(cursor * FPS);
        const dur = Math.round(Math.max(1, beat.durationSec) * FPS);
        cursor += Math.max(1, beat.durationSec);
        return (
          <Sequence key={beat.idx} from={from} durationInFrames={dur}>
            <BeatScene beat={beat} brand={props.brand} captionSize={54} captions={props.captions} stickCast={props.stickCast} />
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
      <HighlightFonts />
      <Sequence durationInFrames={dur}>
        <BeatScene beat={beat} brand={props.brand} captionSize={72} vertical captions={props.captions} stickCast={props.stickCast} />
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
    renders only beat 0 as the free long-form byproduct. */
export const VerticalShort: React.FC<VideoProps> = (props) => {
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
            <BeatScene beat={beat} brand={props.brand} captionSize={72} vertical captions={props.captions} stickCast={props.stickCast} />
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

/** Per-beat camera move. Scale ≥1.12 on pans keeps the overscan from revealing
    edges. Default (and unknown) = the classic slow zoom-in. */
function motionStyle(motion: string | undefined, frame: number, dur: number): React.CSSProperties {
  const p = dur > 0 ? Math.min(1, Math.max(0, frame / dur)) : 0;
  const at = (a: number, b: number) => a + (b - a) * p;
  switch (motion) {
    case "zoom-out":
      return { transform: `scale(${at(1.12, 1.02)})` };
    case "pan-left":
      return { transform: `scale(1.12) translateX(${at(3, -3)}%)` };
    case "pan-right":
      return { transform: `scale(1.12) translateX(${at(-3, 3)}%)` };
    case "pan-up":
      return { transform: `scale(1.12) translateY(${at(3, -3)}%)` };
    case "static":
      return { transform: `scale(${at(1.04, 1.06)})` }; // barely-there drift
    case "zoom-in":
    default:
      return { transform: `scale(${at(1.02, 1.12)})` };
  }
}

/** Tier 9 #4 — a section that cross-dissolves through 2–3 stills, each with a
    different Ken-Burns move, instead of holding a single frame. Used for long
    still beats (base = free stock, economy = + cheap FLUX schnell) so the
    visual keeps evolving across a 10s+ section. */
const MULTI_IMAGE_MIN_SEC = 10;
const MULTI_IMAGE_MAX = 3;
const KENBURNS_CYCLE = ["zoom-in", "pan-right", "zoom-out", "pan-left", "pan-up"];
const MultiImageSection: React.FC<{ images: string[] }> = ({ images }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const imgs = images.slice(0, MULTI_IMAGE_MAX);
  const n = imgs.length;
  const segLen = durationInFrames / n;
  const fade = Math.min(Math.round(0.6 * FPS), Math.round(segLen * 0.4));
  return (
    <AbsoluteFill>
      {imgs.map((src, i) => {
        const start = i * segLen;
        const end = (i + 1) * segLen;
        // Crossfade in (except the first image, already on) and out (except the
        // last, which holds to the cut).
        const opacity = interpolate(
          frame,
          [start - fade, start, end - fade, end],
          [i === 0 ? 1 : 0, 1, 1, i === n - 1 ? 1 : 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        // Per-still Ken-Burns, varied across the section; progress is local to
        // each still's window so every image pans fresh.
        const local = Math.min(segLen, Math.max(0, frame - start));
        const motion = motionStyle(KENBURNS_CYCLE[i % KENBURNS_CYCLE.length], local, segLen);
        return (
          <Img
            key={i}
            src={src}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity,
              ...motion,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const BeatScene: React.FC<{
  beat: RenderBeat;
  brand: VideoProps["brand"];
  captionSize: number;
  vertical?: boolean;
  captions?: boolean;
  stickCast?: VideoProps["stickCast"];
}> = ({ beat, brand, captionSize, vertical, captions = true, stickCast }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Art-director per-beat camera motion (default: slow zoom-in). Gives cheap
  // stills life and varies the rhythm across beats.
  const motion = motionStyle(beat.motion, frame, durationInFrames);
  return (
    <AbsoluteFill>
      {beat.stickScene ? (
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
        <FallbackCard beat={beat} brand={brand} motion={motion} />
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
        />
      )}
      <HighlightLayer highlights={beat.highlights} brand={brand} vertical={vertical} />
    </AbsoluteFill>
  );
};

/** Branded fallback scene when a beat has no footage/still. Shows a faded
    keyword from the beat over a moving gradient so the frame still looks like
    intentional design (and never a flat blank screen). */
const FallbackCard: React.FC<{
  beat: RenderBeat;
  brand: VideoProps["brand"];
  motion: React.CSSProperties;
}> = ({ beat, brand, motion }) => {
  // A short, brand-safe headline: the first few words of the beat narration.
  const headline = (beat.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.secondary} 20%, ${brand.primary} 140%)`,
        justifyContent: "center",
        alignItems: "center",
        ...motion,
      }}
    >
      {headline && (
        <div
          style={{
            color: "white",
            opacity: 0.16,
            fontSize: 150,
            fontWeight: 800,
            lineHeight: 1.05,
            textAlign: "center",
            padding: "0 100px",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {headline}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Word-window captions: a sliding phrase with the spoken word highlighted.

    Responsive (Tier 9 #6a): the phrase auto-fits the frame's safe width and
    wraps to ≤2 lines instead of bleeding off-screen. The base font size is
    scaled by the actual composition width (so a 1080-wide Short and a
    4K long-form read the same), then shrunk further when the windowed phrase
    is long enough that it would overflow two lines at the safe width. */
const SAFE_WIDTH_FRAC = 0.86; // 7% horizontal margin each side (title-safe).
const CAPTION_MAX_LINES = 2;
const AVG_GLYPH_FRAC = 0.56; // mean glyph advance ≈ 0.56·fontSize for this weight.
const Captions: React.FC<{
  words: RenderBeat["words"];
  brand: VideoProps["brand"];
  size: number;
  vertical?: boolean;
}> = ({ words, brand, size, vertical }) => {
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

  // Scale the base size by resolution (caller's 54/72 are tuned for
  // 1920-wide long-form / 1080-wide vertical respectively).
  const refWidth = vertical ? 1080 : 1920;
  const scaled = size * (width / refWidth);

  // Auto-fit: keep the phrase within CAPTION_MAX_LINES at the safe width by
  // shrinking the font when the windowed glyph run is too long. Per-word
  // padding/margin (~24px) is added to the run length so spans don't overflow.
  const safeWidth = width * SAFE_WIDTH_FRAC;
  const glyphs = window.reduce((s, w) => s + w.w.length, 0);
  const perWordChrome = 24;
  const fitSize =
    glyphs > 0
      ? (safeWidth * CAPTION_MAX_LINES - window.length * perWordChrome) /
        (glyphs * AVG_GLYPH_FRAC)
      : scaled;
  const fontSize = Math.max(scaled * 0.55, Math.min(scaled, fitSize));

  return (
    <AbsoluteFill
      style={{
        justifyContent: vertical ? "center" : "flex-end",
        alignItems: "center",
        paddingBottom: vertical ? 0 : 70,
        paddingLeft: width * ((1 - SAFE_WIDTH_FRAC) / 2),
        paddingRight: width * ((1 - SAFE_WIDTH_FRAC) / 2),
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
          return (
            <span
              key={winStart + i}
              style={{
                fontSize,
                fontWeight: 800,
                color: isActive ? brand.secondary : "white",
                backgroundColor: isActive ? brand.primary : "transparent",
                borderRadius: 12,
                padding: "2px 10px",
                margin: "0 2px",
                whiteSpace: "nowrap",
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

/** Tier 9 #2 — narrated intro title card. A hero shot (the chosen thumbnail
    frame, slow Ken-Burns) under a darkening scrim, with a bold kinetic phrase
    of the topic that springs in word-by-word, plus an optional short narrated
    hook line. Degrades to the legacy branded gradient + title when no hero
    asset/phrase is supplied. */
const IntroSting: React.FC<VideoProps> = ({
  title,
  projectName,
  brand,
  heroImageUrl,
  heroVideoUrl,
  introPhrase,
  introVoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const fadeOut = interpolate(frame, [INTRO_SEC * FPS - 12, INTRO_SEC * FPS], [1, 0], {
    extrapolateLeft: "clamp",
  });
  // Slow push-in on the hero frame across the card.
  const zoom = interpolate(frame, [0, INTRO_SEC * FPS], [1.04, 1.14], {
    extrapolateRight: "clamp",
  });
  const phrase = (introPhrase || title || "").trim();
  const phraseWords = phrase.split(/\s+/).filter(Boolean);
  const hasHero = Boolean(heroImageUrl || heroVideoUrl);
  // Phrase size scales with frame width; clamps so long hooks still fit.
  const baseSize = width >= 1900 ? 92 : width >= 1280 ? 76 : 64;
  const phraseSize = Math.max(
    baseSize * 0.5,
    Math.min(baseSize, (width * 0.86 * 2) / Math.max(8, phrase.length * 0.56)),
  );
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Hero shot (or branded gradient fallback). */}
      {heroVideoUrl ? (
        <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
          <OffthreadVideo
            src={heroVideoUrl}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : heroImageUrl ? (
        <Img
          src={heroImageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.secondary} 30%, ${brand.primary} 160%)`,
          }}
        />
      )}
      {/* Cinematic scrim so the phrase stays legible over any frame. */}
      <AbsoluteFill
        style={{
          background: hasHero
            ? "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.55) 100%)"
            : "transparent",
        }}
      />
      {introVoUrl && <Audio src={introVoUrl} />}
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", padding: `0 ${width * 0.07}px` }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: brand.primary,
              fontSize: Math.round(baseSize * 0.36),
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: "uppercase",
              marginBottom: 22,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 24}px)`,
              textShadow: "0 2px 14px rgba(0,0,0,0.8)",
            }}
          >
            {projectName}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0 0.28em",
              lineHeight: 1.06,
            }}
          >
            {phraseWords.map((w, i) => {
              // Stagger each word's spring so the phrase builds kinetically.
              const wEnter = spring({
                frame: frame - i * 3,
                fps,
                config: { damping: 13, stiffness: 120 },
              });
              return (
                <span
                  key={i}
                  style={{
                    color: "white",
                    fontSize: phraseSize,
                    fontWeight: 900,
                    letterSpacing: -1,
                    textTransform: "uppercase",
                    opacity: wEnter,
                    transform: `translateY(${(1 - wEnter) * 40}px) scale(${0.9 + wEnter * 0.1})`,
                    textShadow: "0 4px 24px rgba(0,0,0,0.85)",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
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
