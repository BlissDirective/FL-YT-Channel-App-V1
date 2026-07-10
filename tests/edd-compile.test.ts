/**
 * compileEdd — the legacy→EDD bridge (Fable-5-MVDA-Build-Plan.md §2.4).
 * The compiler must produce a VALID document that faithfully reproduces
 * today's timeline: gapless, VO-driven durations, Ken-Burns default, hard
 * cuts, captions from the word timings. (Byte-equivalent RENDER goldens land
 * in Phase A part 2 when the render path exists; here we prove the compiled
 * document is well-formed and structurally faithful.)
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSITIONS,
  compileEdd,
  validateEdd,
  type CompileInput,
  type EddContext,
} from "@studio/core";

function input(): CompileInput {
  return {
    format: "long",
    targetDurationSec: 3 + 6 + 6 + 4, // intro + two 6s beats + outro = 19
    introSec: 3,
    outroSec: 4,
    beats: [
      {
        idx: 0,
        text: "First beat narration here.",
        durationSec: 6,
        voAssetId: "vo-0",
        visualAssetId: "img-0",
        source: "still",
        words: [
          { w: "First", start: 0, end: 0.5 },
          { w: "beat", start: 0.5, end: 1 },
          { w: "narration", start: 1, end: 1.6 },
        ],
      },
      {
        idx: 1,
        text: "Second beat, hero shot.",
        durationSec: 6,
        voAssetId: "vo-1",
        visualAssetId: "img-1",
        source: "ai-clip",
        heroHold: true,
        words: [
          { w: "Second", start: 0, end: 0.5 },
          { w: "beat", start: 0.5, end: 1 },
        ],
      },
    ],
  };
}

function ctxFor(inp: CompileInput): EddContext {
  return {
    assets: [
      { id: "img-0", kind: "clip", durationSec: 10 },
      { id: "img-1", kind: "clip", durationSec: 10 },
      { id: "vo-0", kind: "vo", durationSec: 6 },
      { id: "vo-1", kind: "vo", durationSec: 6 },
    ],
    beats: inp.beats.map((b) => ({ idx: b.idx, hasText: b.text.trim().length > 0 })),
    transitions: DEFAULT_TRANSITIONS,
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(),
    overlayStyles: new Set(),
    musicEnabled: false,
    toleranceSec: Math.max(2, inp.targetDurationSec * 0.05),
  };
}

describe("compileEdd", () => {
  it("produces a document that passes validateEdd", () => {
    const inp = input();
    const doc = compileEdd(inp);
    expect(validateEdd(doc, ctxFor(inp))).toEqual({ ok: true, errors: [] });
  });

  it("lays the video track out gapless starting after the intro", () => {
    const doc = compileEdd(input());
    expect(doc.tracks.video.map((c) => [c.start, c.duration])).toEqual([
      [3, 6],
      [9, 6],
    ]);
  });

  it("welds duration to VO length and defaults trim to the whole clip", () => {
    const doc = compileEdd(input());
    expect(doc.tracks.video[0].trim).toEqual({ in: 0, out: 6 });
  });

  it("uses Ken-Burns by default and hero-hold where flagged", () => {
    const doc = compileEdd(input());
    expect(doc.tracks.video[0].motion.kind).toBe("kenburns");
    expect(doc.tracks.video[1].motion.kind).toBe("heroHold");
  });

  it("makes every beat boundary a hard cut", () => {
    const doc = compileEdd(input());
    expect(doc.tracks.video.every((c) => c.transitionOut.kind === "cut")).toBe(true);
  });

  it("emits one VO cue per beat, aligned to its clip start", () => {
    const doc = compileEdd(input());
    const vo = doc.tracks.audio.filter((a) => a.kind === "vo");
    expect(vo).toHaveLength(2);
    expect(vo[0]).toMatchObject({ assetId: "vo-0", start: 3 });
    expect(vo[1]).toMatchObject({ assetId: "vo-1", start: 9 });
  });

  it("paginates words into non-overlapping caption pages in absolute ms", () => {
    const doc = compileEdd({ ...input(), wordsPerPage: 2 });
    // Beat 0 has 3 words → 2 pages (2 + 1); beat 1 has 2 words → 1 page.
    expect(doc.tracks.captions.length).toBe(3);
    // First token of beat 0 starts at clip start (3s) + word start (0) = 3000ms.
    expect(doc.tracks.captions[0].tokens[0].fromMs).toBe(3000);
    // Beat 1's page is offset by its clip start (9s).
    const last = doc.tracks.captions[doc.tracks.captions.length - 1];
    expect(last.tokens[0].fromMs).toBe(9000);
  });

  it("marks an empty (non-narrated) beat's clip silent", () => {
    const inp = input();
    inp.beats[1].text = "   ";
    inp.beats[1].voAssetId = null;
    const doc = compileEdd(inp);
    expect(doc.tracks.video[1].silent).toBe(true);
  });

  it("carries the target and aspect through to meta", () => {
    const doc = compileEdd(input());
    expect(doc.meta).toMatchObject({ schemaVersion: 1, format: "long", fps: 30, aspect: "16:9", targetDurationSec: 19 });
  });
});
