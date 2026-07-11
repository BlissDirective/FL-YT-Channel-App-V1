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
        visualDurationSec: 10,
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
        visualDurationSec: 10,
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
    toleranceSec: Math.max(2, (inp.targetDurationSec ?? 0) * 0.05),
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

  // Audit A1 — legacy floors every beat at 1s (Math.max(1, durationSec) in
  // beatTimeline/VideoComp); a frame-floor compiler would drift every
  // subsequent clip start and the goldens could never pass.
  it("floors sub-1s beats at 1s exactly like the legacy timeline", () => {
    const inp = input();
    inp.beats[0].durationSec = 0.4;
    const doc = compileEdd(inp);
    expect(doc.tracks.video.map((c) => [c.start, c.duration])).toEqual([
      [3, 1],
      [4, 6],
    ]);
  });

  // Audit A3 — a compiled v1 must ALWAYS validate. When the brief target is
  // omitted, the compiler pins meta.targetDurationSec to the actual runtime,
  // so a legacy video whose VO drifted far from the brief still compiles to
  // an insertable document.
  it("defaults targetDurationSec to the actual runtime when omitted", () => {
    const inp = input();
    delete inp.targetDurationSec;
    inp.beats[0].durationSec = 20; // way past any brief tolerance
    const doc = compileEdd(inp);
    expect(doc.meta.targetDurationSec).toBe(3 + 20 + 6 + 4);
    // A3b — the beat outruns its 10s source: legacy loops it, so the trim
    // window clamps to the source instead of failing validation.
    expect(doc.tracks.video[0].trim).toEqual({ in: 0, out: 10 });
    expect(validateEdd(doc, { ...ctxFor(inp), toleranceSec: 2 }).ok).toBe(true);
  });

  // Audit A2 — VerticalShort has no intro sting; its body starts at 0 and it
  // ends on the 1.5s compact CTA tail (SHORT_TAIL_SEC).
  it("compiles a short with no sting, clips from 0, and the CTA tail", () => {
    const inp = input();
    inp.format = "short";
    inp.introSec = 0;
    inp.outroSec = 1.5;
    delete inp.targetDurationSec;
    const doc = compileEdd(inp);
    expect(doc.intro).toEqual({ sting: false, sec: 0 });
    expect(doc.outro).toEqual({ endCard: true, sec: 1.5 });
    expect(doc.tracks.video[0].start).toBe(0);
    expect(doc.meta.aspect).toBe("9:16");
    expect(validateEdd(doc, ctxFor(inp)).ok).toBe(true);
  });

  // Audit A5 — the legacy LongForm CTA lower-third (70% of runtime, 5s) must
  // live IN the document, or an EDD-driven render silently drops it.
  it("emits the legacy CTA lower-third when ctaText is passed", () => {
    const inp = { ...input(), ctaText: "Enjoying this? Subscribe — it's free" };
    const doc = compileEdd(inp);
    expect(doc.tracks.overlays).toEqual([
      { kind: "lowerThird", text: inp.ctaText, startSec: 19 * 0.7, durationSec: 5 },
    ]);
    expect(validateEdd(doc, ctxFor(inp)).ok).toBe(true);
  });

  // Audit A14 — legacy hard-cuts VO at the beat boundary (Audio inside the
  // beat's Sequence); the compiled cue must carry that window as trim.
  it("trims each VO cue to its beat window", () => {
    const doc = compileEdd(input());
    const vo = doc.tracks.audio.filter((a) => a.kind === "vo");
    expect(vo[0]).toMatchObject({ trim: { in: 0, out: 6 } });
  });

  // Audit A15b — legacy's sliding window keeps the current chunk on screen
  // until the next begins; pages must hold to the next page / the clip end.
  it("holds caption pages to the next page start and the clip end", () => {
    const doc = compileEdd({ ...input(), wordsPerPage: 2 });
    // Beat 0 (clip 3–9s): pages [p0, p1]; p0 holds to p1.startMs, p1 to 9000.
    const beat0 = doc.tracks.captions.filter((p) => p.startMs < 9000);
    expect(beat0[0].endMs).toBe(beat0[1].startMs);
    expect(beat0[beat0.length - 1].endMs).toBe(9000);
  });

  // Audit A15 — ASR jitter (overlapping / out-of-order words, ends past the
  // VO duration) must be sanitized, or the compiled doc fails validation.
  it("sanitizes overlapping and overrunning word timings into a valid doc", () => {
    const inp = input();
    inp.beats[0].words = [
      { w: "one", start: 0.1, end: 0.62 },
      { w: "two", start: 0.5, end: 0.48 }, // overlaps AND ends before it starts
      { w: "three", start: 5.9, end: 7.5 }, // runs past the 6s beat
    ];
    const doc = compileEdd(inp);
    expect(validateEdd(doc, ctxFor(inp)).ok).toBe(true);
    const tokens = doc.tracks.captions.flatMap((p) => p.tokens);
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].fromMs).toBeGreaterThanOrEqual(tokens[i - 1].toMs);
    }
  });

  // Audit A16 — legacy verticals center their captions.
  it("centers caption pages on shorts", () => {
    const inp = input();
    inp.format = "short";
    inp.introSec = 0;
    inp.outroSec = 1.5;
    delete inp.targetDurationSec;
    const doc = compileEdd(inp);
    expect(doc.tracks.captions.every((p) => p.position === "center")).toBe(true);
  });
});
