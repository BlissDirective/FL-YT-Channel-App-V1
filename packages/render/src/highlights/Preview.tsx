import React from "react";
import { AbsoluteFill, Loop, useVideoConfig } from "remotion";
import type { Highlight } from "../types";
import { PRESETS } from "./presets";
import { HighlightFonts } from "./fonts";

/**
 * Dev-only QA composition: lays out all 8 highlight presets in a grid with
 * representative content so they can be eyeballed (rendered to a still/MP4)
 * without standing up the interactive Studio. Not used by the render farm.
 */

const BRAND = { primary: "#F5B829", secondary: "#17150F" };

const SAMPLES: { preset: Highlight["stylePreset"]; text: string; emphasisWord?: string }[] = [
  { preset: "word-pop", text: "92% NEVER FINISH", emphasisWord: "92%" },
  { preset: "highlight-box-swipe", text: "THE ONE TRICK", emphasisWord: "ONE" },
  { preset: "stat-card", text: "$4,000,000 GONE", emphasisWord: "$4,000,000" },
  { preset: "quote-card", text: "I NEVER SAW IT COMING" },
  { preset: "typewriter", text: "THE TRUTH IS SIMPLE" },
  { preset: "color-flash-pop", text: "DO NOT BLINK", emphasisWord: "NOT" },
  { preset: "sticker-tag", text: "WAIT FOR IT" },
  { preset: "underline-swipe", text: "REMEMBER THIS", emphasisWord: "THIS" },
];

const mk = (s: (typeof SAMPLES)[number]): Highlight => ({
  id: s.preset,
  text: s.text,
  emphasisWord: s.emphasisWord,
  stylePreset: s.preset,
  fontFamily: "Anton",
  emphasisColor: BRAND.primary,
  position: "center",
  intensity: "high",
  maxLines: 2,
  startMs: 0,
  endMs: 3000,
});

export const HighlightPreview: React.FC = () => {
  const { width, height } = useVideoConfig();
  const cols = 4;
  const rows = 2;
  const cw = width / cols;
  const ch = height / rows;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0b08" }}>
      <HighlightFonts />
      {SAMPLES.map((s, i) => {
        const hl = mk(s);
        const Preset = PRESETS[s.preset];
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <div
            key={s.preset}
            style={{
              position: "absolute",
              left: col * cw,
              top: row * ch,
              width: cw,
              height: ch,
              overflow: "hidden",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              // subtle gradient so light text stays legible
              background: "linear-gradient(135deg,#1a1813,#24201a)",
            }}
          >
            {/* re-trigger the entrance animation every ~2.5s */}
            <Loop durationInFrames={75}>
              <Preset hl={hl} brand={BRAND} baseSize={40} vertical={false} />
            </Loop>
            <div
              style={{
                position: "absolute",
                left: 14,
                bottom: 12,
                fontFamily: "monospace",
                fontSize: 18,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 0.5,
              }}
            >
              {s.preset}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
