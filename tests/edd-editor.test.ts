/**
 * Pure /edit operations (src/lib/edd-editor.ts) — every operation must keep
 * the document validateEdd-able (D9 gapless + fits), since the editor chains
 * them freely before a save.
 */
import { describe, expect, it } from "vitest";
import {
  CTA_TEXT,
  INTRO_SEC,
  OUTRO_SEC,
  compileEdd,
  introOutroRuntime,
  validateEdd,
  type CompileInput,
  type EddContext,
} from "@studio/core";
import {
  diffSummary,
  heroHoldPreset,
  kenBurnsPreset,
  normalizeTarget,
  removeAudioCue,
  retimeClip,
  splitClip,
  setClipSilent,
  setMotion,
  setPageStyle,
  setTokenEmphasis,
  setTransition,
  setTrim,
  swapClipAsset,
  addOverlay,
} from "../src/lib/edd-editor";

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
      words: [
        { w: "alpha", start: 0.2, end: 0.9 },
        { w: "beta", start: 0.9, end: 1.6 },
        { w: "gamma", start: 1.6, end: 2.4 },
      ],
    })),
  };
}

function ctx(target: number): EddContext {
  return {
    assets: [
      ...[0, 1, 2].map((i) => ({ id: `img-${i}`, kind: "clip" })),
      ...[0, 1, 2].map((i) => ({ id: `vo-${i}`, kind: "vo", durationSec: 6 })),
      { id: "clip-x", kind: "clip", durationSec: 8 },
    ],
    beats: [0, 1, 2].map((idx) => ({ idx, hasText: true })),
    transitions: { cut: { maxSec: 0 }, crossfade: { maxSec: 1.5 }, whip: { maxSec: 0.6 }, dipToBlack: { maxSec: 1.2 }, dissolve: { maxSec: 1.5 }, slide: { maxSec: 1 }, zoomBlur: { maxSec: 0.8 } },
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(),
    overlayStyles: new Set(["word-pop", "bar"]),
    musicEnabled: false,
    toleranceSec: Math.max(2, target * 0.05),
  };
}

const validAfter = (doc: ReturnType<typeof compileEdd>) => {
  const normalized = normalizeTarget(doc);
  return validateEdd(normalized, ctx(normalized.meta.targetDurationSec));
};

describe("edd-editor operations keep the document valid", () => {
  it("retime GROW reflows later clips, VO cues, captions, and the CTA stays valid", () => {
    const doc = compileEdd(input());
    const grown = retimeClip(doc, "v2", 9);
    expect(validAfter(grown).errors).toEqual([]);
    // Later clip shifted by +3.
    expect(grown.tracks.video[2].start).toBeCloseTo(doc.tracks.video[2].start + 3, 3);
    // Beat 2's VO cue moved with its clip.
    const vo2 = grown.tracks.audio.filter((c) => c.kind === "vo")[2];
    expect(vo2.start).toBeCloseTo(grown.tracks.video[2].start, 3);
    // Runtime grew by 3.
    expect(introOutroRuntime(grown)).toBeCloseTo(introOutroRuntime(doc) + 3, 3);
  });

  it("retime SHRINK truncates the clip's caption tail and stays valid", () => {
    const doc = compileEdd({ ...input(), wordsPerPage: 2 });
    const shrunk = retimeClip(doc, "v1", 1.5);
    expect(validAfter(shrunk).errors).toEqual([]);
    // No caption content of clip v1 extends past its new end (intro 3 + 1.5).
    const endMs = Math.round((3 + 1.5) * 1000);
    const clip1Pages = shrunk.tracks.captions.filter((p) => p.startMs < endMs);
    for (const p of clip1Pages) expect(p.endMs).toBeLessThanOrEqual(endMs);
    // Beat 1's clip now starts at 4.5.
    expect(shrunk.tracks.video[1].start).toBeCloseTo(4.5, 3);
  });

  it("retime floors at the legacy 1s minimum", () => {
    const doc = compileEdd(input());
    expect(retimeClip(doc, "v1", 0.2).tracks.video[0].duration).toBe(1);
  });

  it("split divides a clip into two valid halves, preserving runtime + VO coverage", () => {
    const doc = compileEdd(input());
    const before = doc.tracks.video.length;
    const orig = doc.tracks.video.find((c) => c.id === "v1")!;
    const split = splitClip(doc, "v1", 2.5);
    expect(validAfter(split).errors).toEqual([]); // VO coverage + gapless survive
    expect(split.tracks.video.length).toBe(before + 1);
    // Total runtime is unchanged (an internal split, not a retime).
    expect(introOutroRuntime(split)).toBeCloseTo(introOutroRuntime(doc), 3);
    const idx = split.tracks.video.findIndex((c) => c.id === "v1");
    const first = split.tracks.video[idx];
    const second = split.tracks.video[idx + 1];
    expect(first.duration).toBeCloseTo(2.5, 3);
    expect(second.duration).toBeCloseTo(orig.duration - 2.5, 3);
    expect(second.start).toBeCloseTo(first.start + 2.5, 3); // gapless join
    expect(second.beatIdx).toBe(first.beatIdx); // both cover the same narrated beat
    expect(first.transitionOut.kind).toBe("cut"); // hard cut between halves
    expect(second.id).not.toBe(first.id); // unique id
  });

  it("split is a no-op when the offset leaves less than a frame on a side", () => {
    const doc = compileEdd(input());
    expect(splitClip(doc, "v1", 0.01).tracks.video.length).toBe(doc.tracks.video.length);
    expect(splitClip(doc, "v1", 5.999).tracks.video.length).toBe(doc.tracks.video.length);
    expect(splitClip(doc, "nope", 3).tracks.video.length).toBe(doc.tracks.video.length);
  });

  it("swap + trim + motion + transition compose and stay valid", () => {
    let doc = compileEdd(input());
    doc = swapClipAsset(doc, "v2", { id: "clip-x", source: "ai-clip", durationSec: 8 });
    doc = setTrim(doc, "v2", 1, 5);
    doc = setMotion(doc, "v2", heroHoldPreset());
    doc = setTransition(doc, "v1", { kind: "whip", sec: 0.4 });
    doc = setTransition(doc, "v2", { kind: "crossfade", sec: 0.8 });
    expect(validAfter(doc).errors).toEqual([]);
    expect(doc.tracks.video[1].assetId).toBe("clip-x");
    expect(doc.tracks.video[1].trim).toEqual({ in: 1, out: 5 });
  });

  it("clamps a transition to its registry max and forces the last clip to cut", () => {
    let doc = compileEdd(input());
    doc = setTransition(doc, "v1", { kind: "whip", sec: 5 }); // whip max 0.6
    const t1 = doc.tracks.video[0].transitionOut;
    expect("sec" in t1 && t1.sec).toBeLessThanOrEqual(0.6);
    doc = setTransition(doc, "v3", { kind: "crossfade", sec: 0.5 });
    expect(doc.tracks.video[2].transitionOut).toEqual({ kind: "cut" });
    expect(validAfter(doc).errors).toEqual([]);
  });

  it("keyframe motion is pinned to cover the clip", () => {
    const doc = compileEdd(input());
    const next = setMotion(doc, "v1", {
      kind: "keyframes",
      points: [
        { t: 2, scale: 1, x: 0, y: 0, ease: "linear" },
        { t: 4, scale: 1.2, x: 2, y: 0, ease: "easeOut" },
      ],
    });
    const m = next.tracks.video[0].motion;
    expect(m.kind).toBe("keyframes");
    if (m.kind === "keyframes") {
      expect(m.points[0].t).toBe(0);
      expect(m.points[m.points.length - 1].t).toBe(next.tracks.video[0].duration);
    }
    expect(validAfter(next).errors).toEqual([]);
  });

  it("silent pause MUTES the beat's VO cue and un-toggling restores it", () => {
    const doc = compileEdd(input());
    const muted = setClipSilent(doc, "v2", true);
    expect(muted.tracks.video[1].silent).toBe(true);
    const cue = muted.tracks.audio.filter((c) => c.kind === "vo")[1];
    expect(cue.gainDb).toBe(-60); // muted, not deleted — the toggle is reversible
    expect(validAfter(muted).errors).toEqual([]);
    const restored = setClipSilent(muted, "v2", false);
    expect(restored.tracks.video[1].silent).toBeUndefined();
    expect(restored.tracks.audio.filter((c) => c.kind === "vo")[1].gainDb).toBe(0);
    expect(validAfter(restored).errors).toEqual([]);
  });

  it("shrinking a clip clamps overlays that would dangle past the new runtime", () => {
    let doc = compileEdd(input());
    // A highlight + lower-third near the end of the last clip's window.
    const lastStart = doc.tracks.video[2].start; // 15s (intro 3 + 6 + 6)
    doc = addOverlay(doc, {
      kind: "highlight",
      text: "TAIL",
      startMs: Math.round((lastStart + 4) * 1000),
      endMs: Math.round((lastStart + 5.5) * 1000),
      style: "word-pop",
      anchor: { kind: "abs", sec: lastStart + 4 },
    });
    doc = addOverlay(doc, { kind: "lowerThird", text: "late", startSec: lastStart + 5, durationSec: 3 });
    const shrunk = retimeClip(doc, "v3", 1.5); // last clip 6s → 1.5s
    // Both overlays no longer fit — dropped/clamped, and the doc stays valid.
    expect(validAfter(shrunk).errors).toEqual([]);
  });

  it("VO trim clamp respects a front-trimmed window (trim.in > 0)", () => {
    const doc = compileEdd(input());
    // Simulate an agent-trimmed VO: 2s shaved off the front of beat 1's cue.
    const trimmed = structuredClone(doc);
    const cue = trimmed.tracks.audio.filter((c) => c.kind === "vo")[1];
    if (cue.kind === "vo") cue.trim = { in: 2, out: 8 };
    const shrunk = retimeClip(trimmed, "v2", 4);
    const after = shrunk.tracks.audio.filter((c) => c.kind === "vo")[1];
    // Audible window = trim.in + new duration, NOT min(out, duration).
    if (after.kind === "vo") expect(after.trim).toEqual({ in: 2, out: 6 });
  });

  it("emphasis + page style edits stay valid; VO cues can't be removed", () => {
    let doc = compileEdd(input());
    doc = setTokenEmphasis(doc, 0, 1, "pop");
    doc = setPageStyle(doc, 0, { position: "center" });
    expect(doc.tracks.captions[0].tokens[1].emphasis).toBe("pop");
    expect(doc.tracks.captions[0].position).toBe("center");
    const before = doc.tracks.audio.length;
    doc = removeAudioCue(doc, 0); // index 0 is a VO cue — must be a no-op
    expect(doc.tracks.audio.length).toBe(before);
    expect(validAfter(doc).errors).toEqual([]);
  });

  it("overlay add + normalizeTarget keep a big re-cut valid", () => {
    let doc = compileEdd(input());
    doc = addOverlay(doc, { kind: "progressBar", style: "bar" });
    doc = retimeClip(doc, "v1", 12); // way past the compiled target's ±5%
    doc = normalizeTarget(doc);
    expect(validateEdd(doc, ctx(doc.meta.targetDurationSec)).errors).toEqual([]);
  });

  it("diffSummary names the edits", () => {
    const a = compileEdd(input());
    let b = retimeClip(a, "v1", 8);
    b = setTransition(b, "v1", { kind: "crossfade", sec: 0.5 });
    b = setTokenEmphasis(b, 0, 0, "color");
    const summary = diffSummary(a, b).join(" | ");
    expect(summary).toMatch(/6s → 8/);
    expect(summary).toMatch(/transition cut → crossfade/);
    expect(summary).toMatch(/kinetic emphases 0 → 1/);
    expect(summary).toMatch(/runtime/);
  });

  it("presets emit the documented specs", () => {
    expect(kenBurnsPreset()).toEqual({ kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" });
    expect(heroHoldPreset()).toEqual({ kind: "heroHold", rate: 0.5 });
  });
});
