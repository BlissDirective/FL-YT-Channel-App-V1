/**
 * setIntroOutro must keep the `sec` reserved on the timeline consistent with the
 * sting/endCard boolean. The render reserves intro.sec/outro.sec unconditionally
 * and paints that span ONLY via the sting/end-card sequences — so toggling the
 * card off without zeroing the seconds left a reserved-but-unpainted span that
 * rendered as a black frame on dark-branded channels.
 */
import { describe, expect, it } from "vitest";
import {
  CTA_TEXT,
  INTRO_SEC,
  OUTRO_SEC,
  compileEdd,
  setIntroOutro,
  type CompileInput,
  type EddContext,
} from "@studio/core";

function input(): CompileInput {
  return {
    format: "long",
    introSec: INTRO_SEC,
    outroSec: OUTRO_SEC,
    ctaText: CTA_TEXT,
    beats: [0, 1, 2].map((idx) => ({
      idx,
      text: `Beat ${idx} narration.`,
      durationSec: 6,
      voAssetId: `vo-${idx}`,
      visualAssetId: `img-${idx}`,
      source: "still" as const,
      words: [{ w: "alpha", start: 0.2, end: 0.9 }],
    })),
  };
}

function ctx(): EddContext {
  return {
    assets: [
      ...[0, 1, 2].map((i) => ({ id: `img-${i}`, kind: "clip" })),
      ...[0, 1, 2].map((i) => ({ id: `vo-${i}`, kind: "vo", durationSec: 6 })),
    ],
    beats: [0, 1, 2].map((idx) => ({ idx, hasText: true })),
    transitions: { cut: { maxSec: 0 }, crossfade: { maxSec: 1.5 }, whip: { maxSec: 0.6 }, dipToBlack: { maxSec: 1.2 }, dissolve: { maxSec: 1.5 }, slide: { maxSec: 1 }, zoomBlur: { maxSec: 0.8 } },
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(),
    overlayStyles: new Set(["word-pop", "bar"]),
    musicEnabled: false,
    toleranceSec: 4,
  };
}

describe("setIntroOutro keeps sec ⇔ boolean consistent", () => {
  it("turning the end card OFF zeroes the reserved outro seconds (no black tail)", () => {
    const doc = compileEdd(input());
    expect(doc.outro.sec).toBeGreaterThan(0);
    const off = setIntroOutro(doc, { endCard: false });
    expect(off.outro.endCard).toBe(false);
    expect(off.outro.sec).toBe(0);
  });

  it("turning the end card back ON restores a real duration", () => {
    const doc = compileEdd(input());
    const off = setIntroOutro(doc, { endCard: false });
    const on = setIntroOutro(off, { endCard: true });
    expect(on.outro.endCard).toBe(true);
    expect(on.outro.sec).toBe(OUTRO_SEC);
  });

  it("turning the intro sting OFF zeroes the reserved intro seconds", () => {
    const doc = compileEdd(input());
    const off = setIntroOutro(doc, { sting: false });
    expect(off.intro.sting).toBe(false);
    expect(off.intro.sec).toBe(0);
  });

  it("a reserved span always has a matching boolean (never sec>0 with the layer off)", () => {
    const doc = compileEdd(input());
    for (const patch of [{ endCard: false }, { endCard: true }, { sting: false }, { sting: true }]) {
      const d = setIntroOutro(doc, patch);
      if (d.outro.sec > 0) expect(d.outro.endCard).toBe(true);
      if (d.intro.sec > 0) expect(d.intro.sting).toBe(true);
    }
  });
});
