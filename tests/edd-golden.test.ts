/**
 * EDD ↔ legacy render goldens, layer 1 of audit A8: the deterministic
 * props/timeline golden. The compiled document's timeline must equal what the
 * REAL legacy functions (packages/render/src/types.ts — imported here, not
 * re-implemented) produce for the same video, and every compiled field must
 * carry the exact legacy value (CTA at 70%, caption times = clip start + word
 * offsets, VO cues at clip starts, motion mapping). Layer 2 (sampled-frame
 * pixel equality) runs with a real Remotion render in CI.
 */
import { describe, expect, it } from "vitest";
import {
  CTA_TEXT,
  INTRO_SEC,
  OUTRO_SEC,
  SHORT_TAIL_SEC,
  compileEdd,
  eddTimeline,
  introOutroRuntime,
  legacyMotionToSpec,
  resolveWordAnchorSec,
  type CompileInput,
  type EditDocument,
} from "@studio/core";
import {
  beatTimeline,
  longFormDurationSec,
  verticalShortDurationSec,
  type VideoProps,
} from "../packages/render/src/types";

/** A representative long-form: mixed durations (incl. a sub-1s beat that
    exercises the legacy 1s floor), varied motions, a hero clip. */
function fixture(): { input: CompileInput; props: VideoProps } {
  const beats = [
    { idx: 0, sec: 6.4, motion: undefined, hero: false, isVideo: false },
    { idx: 1, sec: 0.4, motion: "zoom-out", hero: false, isVideo: false },
    { idx: 2, sec: 9.1, motion: "pan-left", hero: false, isVideo: false },
    { idx: 3, sec: 7.0, motion: undefined, hero: true, isVideo: true },
  ];
  const words = (sec: number) => [
    { w: "alpha", start: 0.1, end: 0.5 },
    { w: "beta", start: 0.5, end: Math.max(0.9, sec - 0.2) },
  ];
  const input: CompileInput = {
    format: "long",
    introSec: INTRO_SEC,
    outroSec: OUTRO_SEC,
    ctaText: CTA_TEXT,
    beats: beats.map((b) => ({
      idx: b.idx,
      text: `Beat ${b.idx} narration.`,
      durationSec: b.sec,
      voAssetId: `vo-${b.idx}`,
      visualAssetId: `img-${b.idx}`,
      source: b.isVideo ? "ai-clip" : "still",
      heroHold: b.hero,
      motion: b.motion,
      visualIsVideo: b.isVideo,
      visualDurationSec: b.isVideo ? 8 : undefined,
      words: words(b.sec),
    })),
  };
  const props: VideoProps = {
    title: "Golden",
    projectName: "Studio",
    brand: { primary: "#F5B829", secondary: "#17150F" },
    beats: beats.map((b) => ({
      idx: b.idx,
      text: `Beat ${b.idx} narration.`,
      durationSec: b.sec,
      words: words(b.sec),
      voUrl: `https://signed/vo-${b.idx}`,
      shotType: b.hero ? "hero" : "broll",
      motion: b.motion,
      heroHold: b.hero,
      videoUrl: b.isVideo ? `https://signed/clip-${b.idx}` : undefined,
      imageUrl: b.isVideo ? undefined : `https://signed/img-${b.idx}`,
    })),
  };
  return { input, props };
}

describe("EDD golden — compiled timeline ≡ legacy timeline (A8 layer 1)", () => {
  it("clip windows equal the legacy beatTimeline exactly", () => {
    const { input, props } = fixture();
    const doc = compileEdd(input);
    expect(eddTimeline(doc)).toEqual(beatTimeline(props));
  });

  it("total runtime equals the legacy longFormDurationSec", () => {
    const { input, props } = fixture();
    const doc = compileEdd(input);
    expect(introOutroRuntime(doc)).toBeCloseTo(longFormDurationSec(props), 6);
  });

  it("a compiled short equals the legacy verticalShortDurationSec", () => {
    const { input, props } = fixture();
    const shortInput: CompileInput = {
      ...input,
      format: "short",
      introSec: 0,
      outroSec: SHORT_TAIL_SEC,
      ctaText: undefined,
    };
    const doc = compileEdd(shortInput);
    expect(introOutroRuntime(doc)).toBeCloseTo(verticalShortDurationSec(props), 6);
    expect(doc.tracks.video[0].start).toBe(0);
    expect(doc.intro.sting).toBe(false);
  });

  it("VO cues start exactly at their clip starts", () => {
    const { input, props } = fixture();
    const doc = compileEdd(input);
    const legacy = beatTimeline(props);
    const voStarts = doc.tracks.audio.filter((a) => a.kind === "vo").map((a) => a.start);
    expect(voStarts).toEqual(legacy.map((t) => t.start));
  });

  it("caption tokens sit at clip start + word offset (legacy absolute times)", () => {
    const { input, props } = fixture();
    const doc = compileEdd(input);
    const legacy = beatTimeline(props);
    // First token of each beat's first page = clip start + 0.1s.
    for (const t of legacy) {
      const expected = Math.round((t.start + 0.1) * 1000);
      const page = doc.tracks.captions.find((p) => p.tokens[0]?.fromMs === expected);
      expect(page, `beat ${t.idx} first token at ${expected}ms`).toBeTruthy();
    }
  });

  it("the CTA lower-third lands at 70% of the legacy total for 5s", () => {
    const { input, props } = fixture();
    const doc = compileEdd(input);
    const cta = doc.tracks.overlays.find((o) => o.kind === "lowerThird");
    expect(cta).toMatchObject({
      text: CTA_TEXT,
      durationSec: 5,
    });
    expect((cta as { startSec: number }).startSec).toBeCloseTo(longFormDurationSec(props) * 0.7, 6);
  });

  it("motion mapping matches the legacy motionStyle table (A11/A12)", () => {
    const { input } = fixture();
    const doc = compileEdd(input);
    const motions = doc.tracks.video.map((c) => c.motion);
    // beat 0: default still → zoom-in 1.02→1.12
    expect(motions[0]).toEqual({ kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" });
    // beat 1: zoom-out still → 1.12→1.02
    expect(motions[1]).toEqual({ kind: "kenburns", fromScale: 1.12, toScale: 1.02, anchor: "center" });
    // beat 2: pan-left still → keyframes scale 1.12, x 3→-3
    expect(motions[2]).toMatchObject({ kind: "keyframes" });
    // beat 3: hero footage → heroHold at the legacy 0.5 rate
    expect(motions[3]).toEqual({ kind: "heroHold", rate: 0.5 });
  });

  it("legacyMotionToSpec covers every art-director motion", () => {
    for (const m of ["zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up", "static", undefined]) {
      const spec = legacyMotionToSpec(m, 5);
      expect(["kenburns", "keyframes"]).toContain(spec.kind);
    }
  });

  it("word anchors resolve to caption token times across pages (A4)", () => {
    const { input } = fixture();
    const doc = compileEdd(input);
    // Clip v1 (beat 0, 2 tokens on one page): token 1 = second word (0.5s in).
    const sec = resolveWordAnchorSec(doc, { kind: "word", clipId: "v1", captionToken: 1 });
    expect(sec).toBeCloseTo(INTRO_SEC + 0.5, 3);
    // Out-of-range token does not resolve.
    expect(resolveWordAnchorSec(doc as EditDocument, { kind: "word", clipId: "v1", captionToken: 99 })).toBeNull();
  });
});
