import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import type { Highlight, HighlightPosition } from "../types";
import { PRESETS } from "./presets";
import { HighlightFonts } from "./fonts";

/**
 * Dev-only QA: render highlights one-at-a-time at production size over real
 * footage stills, to check stroke/readability and Shorts safe-area over a
 * busy image. Not used by the render farm.
 */

const BRAND = { primary: "#F5B829", secondary: "#17150F" };

const hl = (
  o: Partial<Highlight> & Pick<Highlight, "stylePreset" | "text" | "position">,
): Highlight => ({
  id: o.stylePreset + o.text,
  emphasisWord: o.emphasisWord,
  fontFamily: o.fontFamily ?? "Anton",
  emphasisColor: BRAND.primary,
  intensity: "high",
  maxLines: 2,
  startMs: 0,
  endMs: 3000,
  ...o,
});

const Reel: React.FC<{
  bg: string;
  items: Highlight[];
  vertical?: boolean;
  baseSize: number;
}> = ({ bg, items, vertical, baseSize }) => {
  const SEG = 50; // frames per highlight
  return (
    <AbsoluteFill>
      <HighlightFonts />
      <Img src={staticFile(bg)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {items.map((h, i) => {
        const Preset = PRESETS[h.stylePreset];
        return (
          <Sequence key={h.id} from={i * SEG} durationInFrames={SEG} layout="none">
            <Preset hl={h} brand={BRAND} vertical={vertical} baseSize={baseSize} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const POS = (p: HighlightPosition) => p;

export const HighlightOnFootage: React.FC = () => (
  <Reel
    bg="preview/land_1043.jpg"
    baseSize={80}
    items={[
      hl({ stylePreset: "color-flash-pop", text: "DO NOT LOOK AWAY", emphasisWord: "NOT", position: POS("upper-third") }),
      hl({ stylePreset: "word-pop", text: "92% NEVER FINISH", emphasisWord: "92%", position: POS("center") }),
      hl({ stylePreset: "stat-card", text: "$4,000,000 LOST", emphasisWord: "$4,000,000", position: POS("center") }),
      hl({ stylePreset: "highlight-box-swipe", text: "THE REAL REASON", emphasisWord: "REAL", position: POS("center") }),
      hl({ stylePreset: "sticker-tag", text: "WAIT FOR IT", position: POS("lower-third-safe") }),
    ]}
  />
);

export const HighlightOnFootageVertical: React.FC = () => (
  <Reel
    bg="preview/vert.jpg"
    vertical
    baseSize={104}
    items={[
      hl({ stylePreset: "word-pop", text: "GO HERE ONCE", emphasisWord: "ONCE", position: POS("upper-third") }),
      hl({ stylePreset: "sticker-tag", text: "PLOT TWIST", position: POS("center") }),
      hl({ stylePreset: "stat-card", text: "100% WORTH IT", emphasisWord: "100%", position: POS("center") }),
    ]}
  />
);
