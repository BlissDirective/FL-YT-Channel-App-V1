import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CTA_TEXT } from "@studio/core";
import { FPS, type VideoProps } from "./types";

/**
 * Scene components shared by the legacy beat compositions (VideoComp) and the
 * EDD composition (edd/EddVideo). Extracted verbatim from VideoComp so the
 * two timelines render IDENTICAL intro/outro/CTA/fallback frames — the
 * compiler goldens depend on that.
 */

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Hero-hold playback rate: a short premium clip is slowed (and Ken-Burns
    panned) so it stretches cinematically over a long section instead of
    looping obviously. */
export const HERO_RATE = 0.5;

/** Per-beat camera move. Scale ≥1.12 on pans keeps the overscan from revealing
    edges. Default (and unknown) = the classic slow zoom-in. */
export function motionStyle(motion: string | undefined, frame: number, dur: number): React.CSSProperties {
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
export const MULTI_IMAGE_MIN_SEC = 10;
const MULTI_IMAGE_MAX = 3;
const KENBURNS_CYCLE = ["zoom-in", "pan-right", "zoom-out", "pan-left", "pan-up"];
export const MultiImageSection: React.FC<{ images: string[] }> = ({ images }) => {
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

/** Branded fallback scene when a beat has no footage/still. Shows a faded
    keyword from the beat over a moving gradient so the frame still looks like
    intentional design (and never a flat blank screen). */
export const FallbackCard: React.FC<{
  text: string;
  brand: VideoProps["brand"];
  motion: React.CSSProperties;
}> = ({ text, brand, motion }) => {
  // A short, brand-safe headline: the first few words of the beat narration.
  const headline = (text || "")
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

/** Tier 9 #2 — narrated intro title card. A hero shot (the chosen thumbnail
    frame, slow Ken-Burns) under a darkening scrim, with a bold kinetic phrase
    of the topic that springs in word-by-word, plus an optional short narrated
    hook line. Degrades to the legacy branded gradient + title when no hero
    asset/phrase is supplied. Timing follows the mounting Sequence's length
    (legacy mounts it at INTRO_SEC; the EDD mounts it at doc.intro.sec). */
export const IntroSting: React.FC<VideoProps> = ({
  title,
  projectName,
  brand,
  heroImageUrl,
  heroVideoUrl,
  introPhrase,
  introVoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  // Slow push-in on the hero frame across the card.
  const zoom = interpolate(frame, [0, durationInFrames], [1.04, 1.14], {
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

/** CTA pill (the legacy "subscribe" lower-third). The EDD's lowerThird
    overlay passes its own text/sub; legacy renders the default copy. The
    wrapper is a column flex with flex-start alignment so the pill always
    hugs its OWN text — a long sub line must not stretch the pill background. */
export const LowerThird: React.FC<{
  brand: VideoProps["brand"];
  text?: string;
  sub?: string;
}> = ({ brand, text = CTA_TEXT, sub }) => {
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
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            backgroundColor: brand.primary,
            color: brand.secondary,
            fontSize: 32,
            fontWeight: 800,
            padding: "14px 28px",
            borderRadius: 999,
          }}
        >
          {text}
        </div>
        {sub && (
          <div
            style={{
              marginTop: 10,
              marginLeft: 8,
              color: "white",
              fontSize: 24,
              fontWeight: 600,
              textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Caption auto-fit (Tier 9 #6a) — ONE implementation shared by the legacy
//    word-window captions (VideoComp) and the EDD caption pages, so the
//    "clean" style can never drift from the legacy look the goldens compare
//    against. ─────────────────────────────────────────────────────────────
export const CAPTION_SAFE_WIDTH_FRAC = 0.86; // 7% horizontal margin each side (title-safe).
export const CAPTION_MAX_LINES = 2;
const AVG_GLYPH_FRAC = 0.56; // mean glyph advance ≈ 0.56·fontSize for this weight.
const PER_WORD_CHROME = 24; // per-word padding/margin added to the run length.

/** The displayed font size for a caption phrase: the tuned base size scaled
    by resolution, shrunk so the phrase stays within CAPTION_MAX_LINES at the
    safe width, floored at 55% of base. */
export function captionFontSize(args: {
  width: number;
  vertical: boolean;
  baseSize: number;
  glyphs: number;
  wordCount: number;
}): number {
  const refWidth = args.vertical ? 1080 : 1920;
  const scaled = args.baseSize * (args.width / refWidth);
  const safeWidth = args.width * CAPTION_SAFE_WIDTH_FRAC;
  const fitSize =
    args.glyphs > 0
      ? (safeWidth * CAPTION_MAX_LINES - args.wordCount * PER_WORD_CHROME) / (args.glyphs * AVG_GLYPH_FRAC)
      : scaled;
  return Math.max(scaled * 0.55, Math.min(scaled, fitSize));
}

/** The caption word pill (active word = brand highlight), shared for the
    same reason. */
export function captionTokenStyle(
  isActive: boolean,
  brand: VideoProps["brand"],
  fontSize: number,
): React.CSSProperties {
  return {
    fontSize,
    fontWeight: 800,
    color: isActive ? brand.secondary : "white",
    backgroundColor: isActive ? brand.primary : "transparent",
    borderRadius: 12,
    padding: "2px 10px",
    margin: "0 2px",
    whiteSpace: "nowrap",
    textShadow: isActive ? "none" : "0 2px 12px rgba(0,0,0,0.9)",
  };
}

export const EndCard: React.FC<VideoProps & { compact?: boolean }> = ({
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
