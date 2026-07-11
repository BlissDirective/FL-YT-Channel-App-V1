import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionPage, CaptionToken } from "@studio/core";
import { FPS } from "../types";
import {
  CAPTION_MAX_LINES,
  CAPTION_SAFE_WIDTH_FRAC,
  captionFontSize,
  captionTokenStyle,
} from "../scenes";

/**
 * EDD caption pages (non-overlapping pages, styled tokens with per-token
 * kinetic emphasis). The compiled "clean" style reproduces the legacy
 * word-window captions — same 5-word pagination, same active-word brand
 * pill, same auto-fit sizing (both use the shared helpers in scenes.tsx) —
 * so the visual goldens can compare against it. New named styles register in
 * CAPTION_STYLES (+ a name in core's DEFAULT_CAPTION_STYLES so the validator
 * accepts them).
 */

type CaptionStyleCfg = {
  /** Base font size at the reference width (1920 wide / 1080 vertical). */
  baseSizeWide: number;
  baseSizeVertical: number;
  uppercase?: boolean;
};

export const CAPTION_STYLES: Record<string, CaptionStyleCfg> = {
  clean: { baseSizeWide: 54, baseSizeVertical: 72 },
};

export const EddCaptionPages: React.FC<{
  pages: CaptionPage[];
  brand: { primary: string; secondary: string };
  vertical: boolean;
}> = ({ pages, brand, vertical }) => (
  <>
    {pages.map((page, i) => {
      // Cumulative rounding: a page's end frame IS the next page's start
      // frame, so back-to-back pages can't co-occupy a frame (audit A18b).
      const from = Math.round((page.startMs / 1000) * FPS);
      const end = Math.round((page.endMs / 1000) * FPS);
      const dur = Math.max(1, end - from);
      return (
        <Sequence key={i} from={from} durationInFrames={dur} layout="none">
          <EddCaptionPage page={page} brand={brand} vertical={vertical} />
        </Sequence>
      );
    })}
  </>
);

const EddCaptionPage: React.FC<{
  page: CaptionPage;
  brand: { primary: string; secondary: string };
  vertical: boolean;
}> = ({ page, brand, vertical }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const cfg = CAPTION_STYLES[page.style] ?? CAPTION_STYLES.clean;
  // Absolute ms — the page mounts at startMs, so local frame 0 = startMs.
  const nowMs = page.startMs + (frame / FPS) * 1000;

  // The active token is the last one that has started (legacy semantics).
  let active = -1;
  for (let i = 0; i < page.tokens.length; i++) {
    if (nowMs >= page.tokens[i].fromMs) active = i;
    else break;
  }
  if (active < 0) return null;

  const fontSize = captionFontSize({
    width,
    vertical,
    baseSize: vertical ? cfg.baseSizeVertical : cfg.baseSizeWide,
    glyphs: page.tokens.reduce((s, t) => s + t.text.length, 0),
    wordCount: page.tokens.length,
  });
  const safeWidth = width * CAPTION_SAFE_WIDTH_FRAC;

  const justify =
    page.position === "top" ? "flex-start" : page.position === "center" ? "center" : "flex-end";

  return (
    <AbsoluteFill
      style={{
        justifyContent: justify,
        alignItems: "center",
        paddingTop: page.position === "top" ? 70 : 0,
        paddingBottom: page.position === "bottom" ? (vertical ? 140 : 70) : 0,
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
        {page.tokens.map((tok, i) => (
          <EddToken
            key={i}
            tok={tok}
            isActive={i === active}
            nowMs={nowMs}
            brand={brand}
            fontSize={fontSize}
            uppercase={cfg.uppercase}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** One caption token with its kinetic emphasis (D-vocabulary: none | pop |
    color | shake | scale). Emphasis animates around the token's own window. */
const EddToken: React.FC<{
  tok: CaptionToken;
  isActive: boolean;
  nowMs: number;
  brand: { primary: string; secondary: string };
  fontSize: number;
  uppercase?: boolean;
}> = ({ tok, isActive, nowMs, brand, fontSize, uppercase }) => {
  const sinceStart = Math.max(0, nowMs - tok.fromMs);
  const style: React.CSSProperties = {
    ...captionTokenStyle(isActive, brand, fontSize),
    textTransform: uppercase ? "uppercase" : undefined,
    display: "inline-block",
  };

  switch (tok.emphasis) {
    case "pop": {
      // A quick overshoot pulse as the word lands (250ms), then settle.
      if (isActive) {
        const p = Math.min(1, sinceStart / 250);
        style.transform = `scale(${1 + 0.3 * Math.sin(p * Math.PI)})`;
      }
      break;
    }
    case "color":
      // Persistent brand color even when the word is no longer active.
      if (!isActive) {
        style.color = brand.primary;
        style.textShadow = "0 2px 12px rgba(0,0,0,0.9)";
      }
      break;
    case "shake": {
      if (isActive) {
        // Deterministic jitter while the word is spoken.
        const j = sinceStart / 1000;
        const x = Math.sin(j * 62) * 3;
        const y = Math.cos(j * 47) * 2;
        style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
      break;
    }
    case "scale":
      if (isActive) style.transform = "scale(1.18)";
      break;
    case "none":
    default:
      break;
  }

  return <span style={style}>{tok.text}</span>;
};
