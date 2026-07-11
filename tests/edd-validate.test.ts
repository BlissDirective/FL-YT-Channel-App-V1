/**
 * validateEdd — the EDD gate (Fable-5-MVDA-Build-Plan.md §2.3, D5–D9).
 * A valid baseline document + one mutation per rule that must fail. Every
 * rule is a hard error; the validator returns ALL violations.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSITIONS,
  validateEdd,
  type EddContext,
  type EditDocument,
} from "@studio/core";

// ── A minimal, valid long-form document: 2 clips, gapless, narrated. ──
function baseDoc(): EditDocument {
  return {
    meta: { schemaVersion: 1, format: "long", fps: 30, aspect: "16:9", targetDurationSec: 17 },
    intro: { sting: true, sec: 3 },
    outro: { endCard: true, sec: 4 },
    tracks: {
      video: [
        {
          id: "v1",
          beatIdx: 0,
          assetId: "a-img-0",
          source: "still",
          start: 3,
          duration: 5,
          trim: { in: 0, out: 5 },
          motion: { kind: "kenburns", fromScale: 1, toScale: 1.12, anchor: "center" },
          transitionOut: { kind: "crossfade", sec: 0.5 },
        },
        {
          id: "v2",
          beatIdx: 1,
          assetId: "a-img-1",
          source: "stock",
          start: 8,
          duration: 5,
          trim: { in: 0, out: 5 },
          motion: { kind: "kenburns", fromScale: 1, toScale: 1.1, anchor: "center" },
          transitionOut: { kind: "cut" },
        },
      ],
      audio: [
        { kind: "vo", assetId: "a-vo-0", start: 3, gainDb: 0 },
        { kind: "vo", assetId: "a-vo-1", start: 8, gainDb: 0 },
      ],
      captions: [
        {
          startMs: 3000,
          endMs: 4000,
          style: "clean",
          position: "bottom",
          tokens: [{ text: "hello", fromMs: 3000, toMs: 4000, emphasis: "none" }],
        },
      ],
      overlays: [],
    },
  };
}

function baseCtx(): EddContext {
  return {
    assets: [
      { id: "a-img-0", kind: "clip", durationSec: 10 },
      { id: "a-img-1", kind: "clip", durationSec: 10 },
      { id: "a-vo-0", kind: "vo", durationSec: 5 },
      { id: "a-vo-1", kind: "vo", durationSec: 5 },
    ],
    beats: [
      { idx: 0, hasText: true },
      { idx: 1, hasText: true },
    ],
    transitions: DEFAULT_TRANSITIONS,
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(["whoosh", "ding"]),
    overlayStyles: new Set(["bold", "bar"]),
    musicEnabled: false,
    toleranceSec: Math.max(2, 17 * 0.05),
  };
}

const rules = (doc: EditDocument, ctx = baseCtx()) => validateEdd(doc, ctx).errors.map((e) => e.rule);

describe("validateEdd — the baseline is valid", () => {
  it("passes a well-formed gapless narrated document", () => {
    expect(validateEdd(baseDoc(), baseCtx())).toEqual({ ok: true, errors: [] });
  });
});

describe("validateEdd — structure & timeline (D9 gapless)", () => {
  it("rejects fps ≠ 30", () => {
    const d = baseDoc();
    (d.meta as { fps: number }).fps = 24;
    expect(rules(d)).toContain("meta.fps");
  });

  it("rejects a format/aspect mismatch", () => {
    const d = baseDoc();
    d.meta.aspect = "9:16";
    expect(rules(d)).toContain("meta.aspect");
  });

  it("rejects an empty video track", () => {
    const d = baseDoc();
    d.tracks.video = [];
    d.tracks.audio = [];
    d.tracks.captions = [];
    expect(rules(d)).toContain("video.nonempty");
  });

  it("rejects a gap between clips", () => {
    const d = baseDoc();
    d.tracks.video[1].start = 9; // clip 1 ends at 8, clip 2 starts at 9 → gap
    expect(rules(d)).toContain("video.gapless");
  });

  it("rejects an overlap between clips", () => {
    const d = baseDoc();
    d.tracks.video[1].start = 7; // overlaps clip 1 (ends 8)
    expect(rules(d)).toContain("video.gapless");
  });

  it("rejects a zero-duration clip", () => {
    const d = baseDoc();
    d.tracks.video[0].duration = 0;
    expect(rules(d)).toContain("clip.duration");
  });

  it("rejects a duplicate clip id", () => {
    const d = baseDoc();
    d.tracks.video[1].id = "v1";
    expect(rules(d)).toContain("clip.id.unique");
  });

  it("rejects a clip referencing a missing beat", () => {
    const d = baseDoc();
    d.tracks.video[0].beatIdx = 99;
    expect(rules(d)).toContain("clip.beat");
  });
});

describe("validateEdd — assets & trim", () => {
  it("rejects a missing/killed asset", () => {
    const d = baseDoc();
    d.tracks.video[0].assetId = "gone";
    expect(rules(d)).toContain("clip.asset");
  });

  it("allows a null (pending) asset", () => {
    const d = baseDoc();
    d.tracks.video[0].assetId = null;
    expect(rules(d)).not.toContain("clip.asset");
  });

  it("rejects trim out beyond the source duration", () => {
    const d = baseDoc();
    d.tracks.video[0].trim = { in: 0, out: 999 };
    expect(rules(d)).toContain("clip.trim");
  });

  it("rejects trim in ≥ out", () => {
    const d = baseDoc();
    d.tracks.video[0].trim = { in: 5, out: 5 };
    expect(rules(d)).toContain("clip.trim");
  });
});

describe("validateEdd — motion (D5 keyframes)", () => {
  it("accepts full-coverage keyframes", () => {
    const d = baseDoc();
    d.tracks.video[0].motion = {
      kind: "keyframes",
      points: [
        { t: 0, scale: 1, x: 0, y: 0, ease: "easeInOut" },
        { t: 5, scale: 1.2, x: 10, y: 0, ease: "easeInOut" },
      ],
    };
    expect(rules(d)).not.toContain("motion.keyframes");
  });

  it("rejects keyframes that don't cover the clip", () => {
    const d = baseDoc();
    d.tracks.video[0].motion = {
      kind: "keyframes",
      points: [
        { t: 0, scale: 1, x: 0, y: 0, ease: "linear" },
        { t: 3, scale: 1.2, x: 0, y: 0, ease: "linear" }, // clip is 5s
      ],
    };
    expect(rules(d)).toContain("motion.keyframes");
  });

  it("rejects unsorted keyframes", () => {
    const d = baseDoc();
    d.tracks.video[0].motion = {
      kind: "keyframes",
      points: [
        { t: 0, scale: 1, x: 0, y: 0, ease: "linear" },
        { t: 5, scale: 1.2, x: 0, y: 0, ease: "linear" },
        { t: 2, scale: 1.1, x: 0, y: 0, ease: "linear" },
      ],
    };
    expect(rules(d)).toContain("motion.keyframes");
  });
});

describe("validateEdd — transitions (D6 registry)", () => {
  it("rejects an unregistered transition", () => {
    const d = baseDoc();
    d.tracks.video[0].transitionOut = { kind: "sparkle-wipe", sec: 0.4 };
    expect(rules(d)).toContain("transition.registered");
  });

  it("rejects a transition longer than its registry max", () => {
    const d = baseDoc();
    d.tracks.video[0].transitionOut = { kind: "whip", sec: 5 }; // whip max 0.6
    expect(rules(d)).toContain("transition.maxSec");
  });

  it("rejects a transition longer than an adjacent clip", () => {
    const d = baseDoc();
    d.tracks.video[0].duration = 0.3; // shorter than the 0.5s crossfade
    d.tracks.video[1].start = 3.3;
    expect(rules(d)).toContain("transition.fits");
  });

  it("rejects a non-cut final transition", () => {
    const d = baseDoc();
    d.tracks.video[1].transitionOut = { kind: "crossfade", sec: 0.5 };
    expect(rules(d)).toContain("transition.lastCut");
  });

  it("supports a registry-extended transition kind", () => {
    const d = baseDoc();
    d.tracks.video[0].transitionOut = { kind: "glitch", sec: 0.3 };
    const ctx = baseCtx();
    ctx.transitions = { ...DEFAULT_TRANSITIONS, glitch: { maxSec: 0.5 } };
    expect(validateEdd(d, ctx).ok).toBe(true);
  });
});

describe("validateEdd — audio, VO coverage (Decision 1), music gate (D8)", () => {
  it("errors when a narrated beat has no VO and is not silent", () => {
    const d = baseDoc();
    d.tracks.audio = [{ kind: "vo", assetId: "a-vo-0", start: 3, gainDb: 0 }]; // drop beat 1's VO
    expect(rules(d)).toContain("vo.coverage");
  });

  it("allows a narrated beat with no VO when the clip is flagged silent", () => {
    const d = baseDoc();
    d.tracks.audio = [{ kind: "vo", assetId: "a-vo-0", start: 3, gainDb: 0 }];
    d.tracks.video[1].silent = true;
    expect(rules(d)).not.toContain("vo.coverage");
  });

  it("rejects a music cue while music is UI-gated off (D8)", () => {
    const d = baseDoc();
    d.tracks.audio.push({ kind: "music", assetId: "a-img-0", start: 0, gainDb: -12, duck: { mode: "none" } });
    expect(rules(d)).toContain("music.gated");
  });

  it("resolves a word-anchored SFX and rejects an unresolvable one", () => {
    const ok = baseDoc();
    ok.tracks.audio.push({ kind: "sfx", ref: { source: "library", name: "ding" }, at: { kind: "word", clipId: "v1", captionToken: 0 }, gainDb: -6 });
    expect(rules(ok)).not.toContain("sfx.anchor");

    const bad = baseDoc();
    bad.tracks.audio.push({ kind: "sfx", ref: { source: "library", name: "ding" }, at: { kind: "word", clipId: "v9", captionToken: 0 }, gainDb: -6 });
    expect(rules(bad)).toContain("sfx.anchor");
  });

  // Audit A4 — captionToken indexes the clip's tokens flattened across ALL
  // pages overlapping the clip's window (a clip usually spans several 5-word
  // pages), so an anchor past the first page must still resolve.
  it("resolves a word anchor on a later caption page of the same clip", () => {
    const d = baseDoc();
    d.tracks.captions.push({
      startMs: 4500,
      endMs: 6000,
      style: "clean",
      position: "bottom",
      tokens: [
        { text: "second", fromMs: 4500, toMs: 5200, emphasis: "none" },
        { text: "page", fromMs: 5200, toMs: 6000, emphasis: "none" },
      ],
    });
    // Clip v1 spans 3–8s → 3 tokens total across both pages. Index 2 (last
    // token of page 2) resolves; index 3 is out of range.
    d.tracks.audio.push({ kind: "sfx", ref: { source: "library", name: "ding" }, at: { kind: "word", clipId: "v1", captionToken: 2 }, gainDb: -6 });
    expect(rules(d)).not.toContain("sfx.anchor");

    const bad = baseDoc();
    bad.tracks.captions.push(structuredClone(d.tracks.captions[1]));
    bad.tracks.audio.push({ kind: "sfx", ref: { source: "library", name: "ding" }, at: { kind: "word", clipId: "v1", captionToken: 3 }, gainDb: -6 });
    expect(rules(bad)).toContain("sfx.anchor");
  });

  it("rejects an unknown library SFX name", () => {
    const d = baseDoc();
    d.tracks.audio.push({ kind: "sfx", ref: { source: "library", name: "airhorn" }, at: { kind: "abs", sec: 4 }, gainDb: 0 });
    expect(rules(d)).toContain("sfx.ref");
  });
});

describe("validateEdd — captions (no overlap) & overlays", () => {
  it("rejects overlapping caption pages", () => {
    const d = baseDoc();
    d.tracks.captions.push({
      startMs: 3500, // overlaps the first page (3000–4000)
      endMs: 4500,
      style: "clean",
      position: "bottom",
      tokens: [{ text: "world", fromMs: 3500, toMs: 4500, emphasis: "pop" }],
    });
    expect(rules(d)).toContain("caption.overlap");
  });

  it("rejects an unknown caption style", () => {
    const d = baseDoc();
    d.tracks.captions[0].style = "neon";
    expect(rules(d)).toContain("caption.style");
  });

  it("rejects a highlight with an unknown style", () => {
    const d = baseDoc();
    d.tracks.overlays.push({ kind: "highlight", text: "BIG", startMs: 3200, endMs: 3800, style: "mystery", anchor: { kind: "abs", sec: 3.4 } });
    expect(rules(d)).toContain("overlay.highlight");
  });

  it("accepts a valid lower-third and progress bar", () => {
    const d = baseDoc();
    d.tracks.overlays.push({ kind: "lowerThird", text: "Name", startSec: 4, durationSec: 3 });
    d.tracks.overlays.push({ kind: "progressBar", style: "bar" });
    expect(validateEdd(d, baseCtx()).ok).toBe(true);
  });
});

describe("validateEdd — runtime tolerance (±5% / D9)", () => {
  it("rejects a runtime outside target ± tolerance", () => {
    const d = baseDoc();
    d.meta.targetDurationSec = 60; // actual runtime is 3+5+5+4 = 17s
    const ctx = baseCtx();
    ctx.toleranceSec = Math.max(2, 60 * 0.05);
    expect(validateEdd(d, ctx).errors.map((e) => e.rule)).toContain("runtime.total");
  });

  it("accepts a runtime within tolerance", () => {
    const d = baseDoc(); // runtime 17s, target 17s
    expect(validateEdd(d, baseCtx()).ok).toBe(true);
  });
});
