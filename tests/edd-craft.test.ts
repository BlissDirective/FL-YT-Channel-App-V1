/**
 * Phase D craft layer: the deterministic auto-emphasis pass (emphasis.ts)
 * and the advisory taste lint (edd-lint.ts). Both are pure over the compiled
 * document; neither may ever make a valid document invalid.
 */
import { describe, expect, it } from "vitest";
import {
  CTA_TEXT,
  INTRO_SEC,
  OUTRO_SEC,
  autoEmphasis,
  classifyToken,
  compileEdd,
  lintEdd,
  lintSummary,
  pickAutoEmphasis,
  setAudioGain,
  setMotion,
  setTokenEmphasis,
  setTransition,
  validateEdd,
  type CompileInput,
  type EddContext,
  type EditDocument,
} from "@studio/core";

function input(texts: string[]): CompileInput {
  return {
    format: "long",
    introSec: INTRO_SEC,
    outroSec: OUTRO_SEC,
    ctaText: CTA_TEXT,
    beats: texts.map((text, idx) => ({
      idx,
      text,
      durationSec: 6,
      voAssetId: `vo-${idx}`,
      visualAssetId: `img-${idx}`,
      source: "still" as const,
      words: text.split(/\s+/).map((w, i) => ({ w, start: i * 0.5 + 0.1, end: i * 0.5 + 0.5 })),
    })),
  };
}

function ctx(doc: EditDocument): EddContext {
  const n = doc.tracks.video.filter((c) => c.beatIdx >= 0).length + 2;
  return {
    assets: [
      ...Array.from({ length: n }, (_, i) => ({ id: `img-${i}`, kind: "clip" })),
      ...Array.from({ length: n }, (_, i) => ({ id: `vo-${i}`, kind: "vo", durationSec: 6 })),
      { id: "sfx-1", kind: "sfx", durationSec: 1.5 },
    ],
    beats: Array.from({ length: n }, (_, idx) => ({ idx, hasText: true })),
    transitions: { cut: { maxSec: 0 }, crossfade: { maxSec: 1.5 }, whip: { maxSec: 0.6 }, dissolve: { maxSec: 1.5 }, slide: { maxSec: 1 }, dipToBlack: { maxSec: 1.2 }, zoomBlur: { maxSec: 0.8 } },
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(),
    overlayStyles: new Set(["word-pop", "bar"]),
    musicEnabled: false,
    toleranceSec: Number.POSITIVE_INFINITY,
  };
}

describe("classifyToken", () => {
  it("scales money and percentages, pops numbers, colors power words", () => {
    expect(classifyToken("$4,000,000")).toBe("scale");
    expect(classifyToken("97%")).toBe("scale");
    expect(classifyToken("300")).toBe("pop");
    expect(classifyToken("never")).toBe("color");
    expect(classifyToken("Secret")).toBe("color");
    expect(classifyToken("the")).toBeNull();
    expect(classifyToken("engine")).toBeNull();
  });
});

describe("autoEmphasis", () => {
  it("emphasizes at most one token per page, prefers money over power words", () => {
    const doc = compileEdd(input(["They never told you it costs $50 to start"]));
    const { doc: out, picks } = autoEmphasis(doc);
    expect(picks.length).toBeGreaterThan(0);
    for (const page of out.tracks.captions) {
      expect(page.tokens.filter((t) => t.emphasis !== "none").length).toBeLessThanOrEqual(1);
    }
    // The page containing "$50" must emphasize IT, not "never".
    const moneyPage = out.tracks.captions.find((p) => p.tokens.some((t) => t.text.includes("$50")));
    if (moneyPage) {
      const emphasized = moneyPage.tokens.find((t) => t.emphasis !== "none");
      expect(emphasized?.text).toContain("$50");
      expect(emphasized?.emphasis).toBe("scale");
    }
  });

  it("never touches a page with authored emphasis and stays deterministic", () => {
    const base = compileEdd(input(["The secret is 300 dollars", "Nothing beats free money"]));
    const authored = setTokenEmphasis(base, 0, 1, "shake");
    const a = autoEmphasis(authored);
    const b = autoEmphasis(authored);
    expect(a.picks).toEqual(b.picks); // deterministic
    expect(a.picks.every((p) => p.pageIdx !== 0)).toBe(true); // page 0 untouched
    expect(a.doc.tracks.captions[0].tokens[1].emphasis).toBe("shake");
  });

  it("respects the total cap and keeps the document valid", () => {
    const texts = Array.from({ length: 8 }, (_, i) => `Fact ${i}: never pay $${i + 1}00 for this`);
    const doc = compileEdd(input(texts));
    const { doc: out, picks } = autoEmphasis(doc, { maxTotal: 3 });
    expect(picks.length).toBeLessThanOrEqual(3);
    expect(validateEdd(out, ctx(out)).ok).toBe(true);
  });

  it("pickAutoEmphasis returns [] for docs with no captions", () => {
    expect(pickAutoEmphasis([])).toEqual([]);
  });
});

describe("lintEdd", () => {
  it("a freshly compiled document lints clean (or near-clean)", () => {
    const doc = compileEdd(input(["A calm sentence.", "Another calm one."]));
    const warnings = lintEdd(doc);
    // The compiler may hold long stills; everything else must be quiet.
    expect(warnings.filter((w) => !w.rule.startsWith("pacing."))).toEqual([]);
  });

  it("flags emphasis spam per page and overall", () => {
    let doc = compileEdd(input(["one two three four"]));
    for (let i = 0; i < 3; i++) doc = setTokenEmphasis(doc, 0, i, "pop");
    const warnings = lintEdd(doc);
    expect(warnings.some((w) => w.rule === "caption.emphasisDensity")).toBe(true);
  });

  it("flags out-of-band gain but tolerates the -60dB intentional mute", () => {
    const doc = compileEdd(input(["hello world"]));
    const voIdx = doc.tracks.audio.findIndex((c) => c.kind === "vo");
    const hot = setAudioGain(doc, voIdx, 12);
    expect(lintEdd(hot).some((w) => w.rule === "audio.gain")).toBe(true);
    const muted = setAudioGain(doc, voIdx, -60);
    expect(lintEdd(muted).some((w) => w.rule === "audio.gain")).toBe(false);
  });

  it("flags a run of more than 3 consecutive non-cut transitions once", () => {
    let doc = compileEdd(input(["a", "b", "c", "d", "e", "f"]));
    for (const clip of doc.tracks.video.slice(0, 5)) {
      doc = setTransition(doc, clip.id, { kind: "crossfade", sec: 0.5 });
    }
    const runs = lintEdd(doc).filter((w) => w.rule === "pacing.transitionRun");
    expect(runs).toHaveLength(1);
  });

  it("flags a motionless still held past 8s, quiet once motion is added", () => {
    const doc = compileEdd(input(["a very long single beat"]));
    const clip = doc.tracks.video.find((c) => c.beatIdx === 0)!;
    const still = setMotion(doc, clip.id, { kind: "none" });
    const long = { ...still, tracks: { ...still.tracks, video: still.tracks.video.map((c) => (c.id === clip.id ? { ...c, duration: 9 } : c)) } };
    expect(lintEdd(long as EditDocument).some((w) => w.rule === "pacing.staticStill")).toBe(true);
    const moving = setMotion(long as EditDocument, clip.id, { kind: "kenburns", fromScale: 1, toScale: 1.08, anchor: "center" });
    expect(lintEdd(moving).some((w) => w.rule === "pacing.staticStill")).toBe(false);
  });

  it("lintSummary aggregates by rule", () => {
    expect(lintSummary([])).toBe("lint: clean");
    const s = lintSummary([
      { rule: "audio.gain", where: "audio[0]", msg: "x" },
      { rule: "audio.gain", where: "audio[1]", msg: "y" },
    ]);
    expect(s).toContain("2 warnings");
    expect(s).toContain("audio.gain×2");
  });
});
