import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Highlight, HighlightPreset } from "../types";

export type HighlightRenderProps = {
  hl: Highlight;
  brand: { primary: string; secondary: string };
  vertical?: boolean;
  baseSize: number;
};

// ── Shared helpers ────────────────────────────────────────────────────

const AMP: Record<Highlight["intensity"], number> = { subtle: 0.6, med: 1, high: 1.4 };

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}$%.]/gu, "");

const baseText = (font: string, size: number): React.CSSProperties => ({
  fontFamily: `"${font}", "Inter", sans-serif`,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 1.04,
  color: "#fff",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  margin: 0,
  WebkitTextStroke: `${Math.max(2, Math.round(size * 0.045))}px rgba(0,0,0,0.9)`,
  // Stroke painted behind the fill so letters stay crisp on busy footage.
  paintOrder: "stroke fill",
  textShadow: "0 8px 28px rgba(0,0,0,0.55)",
});

/** Positions content in a safe band (avoids Shorts top/bottom UI chrome). */
const Frame: React.FC<{
  position: Highlight["position"];
  vertical?: boolean;
  children: React.ReactNode;
}> = ({ position, vertical, children }) => {
  const justifyContent =
    position === "upper-third" ? "flex-start" : position === "lower-third-safe" ? "flex-end" : "center";
  return (
    <AbsoluteFill
      style={{
        justifyContent,
        alignItems: "center",
        textAlign: "center",
        paddingLeft: vertical ? 70 : 140,
        paddingRight: vertical ? 70 : 140,
        paddingTop: position === "upper-third" ? (vertical ? 340 : 150) : 0,
        paddingBottom: position === "lower-third-safe" ? (vertical ? 460 : 230) : 0,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const isEmphasis = (word: string, emphasis?: string) =>
  Boolean(emphasis) && normWord(word) === normWord(emphasis!);

/** Render a phrase, tinting the emphasis word. */
const Phrase: React.FC<{
  text: string;
  emphasisWord?: string;
  emphasisColor: string;
  style: React.CSSProperties;
}> = ({ text, emphasisWord, emphasisColor, style }) => (
  <div style={style}>
    {text.split(/\s+/).map((w, i) => (
      <span key={i} style={isEmphasis(w, emphasisWord) ? { color: emphasisColor } : undefined}>
        {w}
        {i < text.split(/\s+/).length - 1 ? " " : ""}
      </span>
    ))}
  </div>
);

// ── Presets ───────────────────────────────────────────────────────────

const WordPop: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amp = AMP[hl.intensity];
  const enter = spring({ frame, fps, config: { damping: 10, stiffness: 130, mass: 0.7 } });
  const scale = interpolate(enter, [0, 1], [0.6, 1]) * (1 + 0.04 * amp * Math.max(0, 1 - frame / 8));
  const color = hl.emphasisColor ?? brand.primary;
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div style={{ transform: `scale(${scale})` }}>
        <Phrase
          text={hl.text}
          emphasisWord={hl.emphasisWord}
          emphasisColor={color}
          style={baseText(hl.fontFamily, baseSize)}
        />
      </div>
    </Frame>
  );
};

const HighlightBoxSwipe: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const swipe = interpolate(frame, [6, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const boxColor = hl.emphasisColor ?? brand.primary;
  const words = hl.text.split(/\s+/);
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div style={{ ...baseText(hl.fontFamily, baseSize), opacity: fade }}>
        {words.map((w, i) => {
          const emph = isEmphasis(w, hl.emphasisWord);
          return (
            <span
              key={i}
              style={{
                position: "relative",
                display: "inline-block",
                isolation: "isolate",
                padding: emph ? "0 10px" : 0,
                color: emph && swipe > 0.5 ? brand.secondary : "#fff",
                WebkitTextStroke: emph && swipe > 0.5 ? "0" : undefined,
              }}
            >
              {emph && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: boxColor,
                    borderRadius: 10,
                    transform: `scaleX(${swipe})`,
                    transformOrigin: "left center",
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{w}</span>
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </Frame>
  );
};

const numberParts = (raw: string) => {
  const m = raw.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
  if (!m) return null;
  const value = parseFloat(m[2].replace(/,/g, ""));
  if (!isFinite(value)) return null;
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return { prefix: m[1].trim(), value, decimals, suffix: m[3].trim() };
};

const StatCard: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parts = numberParts(hl.emphasisWord ?? "") ?? numberParts(hl.text);
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const drop = interpolate(enter, [0, 1], [-60, 0]);
  if (!parts) return <WordPop hl={hl} brand={brand} vertical={vertical} baseSize={baseSize} />;
  const count = interpolate(frame, [0, Math.round(fps * 0.7)], [0, parts.value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = count.toLocaleString("en-US", {
    minimumFractionDigits: parts.decimals,
    maximumFractionDigits: parts.decimals,
  });
  const numColor = hl.emphasisColor ?? brand.primary;
  const label = parts.suffix
    ? hl.text
    : hl.text.replace(new RegExp(`\\b${parts.value}\\b`), "").trim();
  return (
    <Frame position="center" vertical={vertical}>
      <div style={{ transform: `translateY(${drop}px)`, opacity: enter }}>
        <div style={{ ...baseText(hl.fontFamily, baseSize * 1.7), color: numColor }}>
          {parts.prefix}
          {shown}
          {parts.suffix ? ` ${parts.suffix}` : ""}
        </div>
        {label && (
          <div style={{ ...baseText(hl.fontFamily, baseSize * 0.5), marginTop: 12 }}>{label}</div>
        )}
      </div>
    </Frame>
  );
};

const QuoteCard: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = hl.text.split(/\s+/);
  const markEnter = spring({ frame, fps, config: { damping: 12 } });
  const style: React.CSSProperties = {
    ...baseText("Playfair Display", baseSize * 0.92),
    textTransform: "none",
    fontStyle: "italic",
    WebkitTextStroke: "0",
    textShadow: "0 4px 22px rgba(0,0,0,0.7)",
  };
  return (
    <Frame position="center" vertical={vertical}>
      <div>
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: baseSize * 1.6,
            fontWeight: 900,
            color: hl.emphasisColor ?? brand.primary,
            lineHeight: 0.5,
            transform: `scale(${markEnter})`,
          }}
        >
          &ldquo;
        </div>
        <div style={style}>
          {words.map((w, i) => {
            const o = interpolate(frame, [i * 3, i * 3 + 9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <span key={i} style={{ opacity: o, display: "inline-block" }}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    </Frame>
  );
};

const Typewriter: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const total = hl.text.length;
  const shown = Math.min(total, Math.floor(frame * 0.9));
  const caretOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div style={baseText(hl.fontFamily, baseSize)}>
        {hl.text.slice(0, shown)}
        <span style={{ color: hl.emphasisColor ?? brand.primary, opacity: caretOn ? 1 : 0.15 }}>
          |
        </span>
      </div>
    </Frame>
  );
};

const ColorFlashPop: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 9, stiffness: 150 } });
  const scale = interpolate(enter, [0, 1], [0.7, 1]);
  const flash = Math.floor(frame / 4) % 2 === 0;
  const color = flash ? hl.emphasisColor ?? brand.primary : "#fff";
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div style={{ transform: `scale(${scale})` }}>
        <Phrase
          text={hl.text}
          emphasisWord={hl.emphasisWord}
          emphasisColor={color}
          style={baseText(hl.fontFamily, baseSize)}
        />
      </div>
    </Frame>
  );
};

const StickerTag: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amp = AMP[hl.intensity];
  const enter = spring({ frame, fps, config: { damping: 11, stiffness: 140, mass: 0.8 } });
  const ty = interpolate(enter, [0, 1], [-140 * amp, 0]);
  const rot = interpolate(enter, [0, 1], [-7 * amp, 0]);
  const bg = hl.emphasisColor ?? brand.primary;
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div
        style={{
          transform: `translateY(${ty}px) rotate(${rot}deg)`,
          backgroundColor: bg,
          color: brand.secondary,
          borderRadius: 22,
          padding: vertical ? "20px 36px" : "16px 32px",
          boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            ...baseText(hl.fontFamily, baseSize),
            color: brand.secondary,
            WebkitTextStroke: "0",
            textShadow: "none",
          }}
        >
          {hl.text}
        </div>
      </div>
    </Frame>
  );
};

const UnderlineSwipe: React.FC<HighlightRenderProps> = ({ hl, brand, vertical, baseSize }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const slide = interpolate(frame, [0, 12], [22, 0], { extrapolateRight: "clamp" });
  const swipe = interpolate(frame, [8, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const color = hl.emphasisColor ?? brand.primary;
  return (
    <Frame position={hl.position} vertical={vertical}>
      <div style={{ opacity: enter, transform: `translateY(${slide}px)`, display: "inline-block" }}>
        <Phrase
          text={hl.text}
          emphasisWord={hl.emphasisWord}
          emphasisColor={color}
          style={baseText(hl.fontFamily, baseSize)}
        />
        <div
          style={{
            height: Math.max(6, Math.round(baseSize * 0.09)),
            marginTop: 10,
            borderRadius: 999,
            background: color,
            transform: `scaleX(${swipe})`,
            transformOrigin: "left center",
          }}
        />
      </div>
    </Frame>
  );
};

export const PRESETS: Record<HighlightPreset, React.FC<HighlightRenderProps>> = {
  "word-pop": WordPop,
  "highlight-box-swipe": HighlightBoxSwipe,
  "stat-card": StatCard,
  "quote-card": QuoteCard,
  typewriter: Typewriter,
  "color-flash-pop": ColorFlashPop,
  "sticker-tag": StickerTag,
  "underline-swipe": UnderlineSwipe,
};
