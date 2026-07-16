/**
 * Editor & Assembly R6 — craft critics (pacing + caption rhythm) and the
 * learning-loop edit-signal classifier. Advisory: these never gate a save; they
 * complement lintEdd and give the MVDA structured notes to act on.
 */
import { describe, expect, it } from "vitest";
import {
  pacingCritique,
  captionRhythmCritique,
  craftCritique,
  diffToEditSignal,
  type EditDocument,
  type VideoClip,
} from "@studio/core";

const clip = (over: Partial<VideoClip>): VideoClip => ({
  id: "v",
  beatIdx: 0,
  assetId: null,
  source: "still",
  start: 0,
  duration: 4,
  trim: { in: 0, out: 4 },
  motion: { kind: "none" },
  transitionOut: { kind: "cut" },
  silent: true,
  ...over,
});

const relaidVideo = (clips: VideoClip[]): VideoClip[] => {
  let cursor = 0;
  return clips.map((c, i) => {
    const laid = { ...c, id: c.id || `v${i + 1}`, start: cursor };
    cursor += c.duration;
    return laid;
  });
};

const doc = (video: VideoClip[], format: "long" | "short" = "long", captions: EditDocument["tracks"]["captions"] = []): EditDocument => ({
  meta: { schemaVersion: 1, format, fps: 30, aspect: format === "short" ? "9:16" : "16:9", targetDurationSec: 60 },
  intro: { sting: false, sec: 0 },
  outro: { endCard: false, sec: 0 },
  tracks: { video: relaidVideo(video), audio: [], captions, overlays: [] },
});

describe("pacingCritique", () => {
  it("flags slow cuts for the format", () => {
    const d = doc([clip({ id: "a", duration: 20 }), clip({ id: "b", duration: 20 })], "long");
    expect(pacingCritique(d).some((n) => n.rule === "pacing.slowCuts")).toBe(true);
  });

  it("flags a monotonous same-source run (> 3 in a row)", () => {
    const d = doc([
      clip({ id: "a", source: "still" }),
      clip({ id: "b", source: "still" }),
      clip({ id: "c", source: "still" }),
      clip({ id: "e", source: "still" }),
    ]);
    const n = pacingCritique(d);
    expect(n.some((x) => x.rule === "pacing.monotony")).toBe(true);
  });

  it("stays quiet on a well-paced, varied timeline", () => {
    const d = doc([
      clip({ id: "a", source: "still", duration: 5 }),
      clip({ id: "b", source: "ai-clip", duration: 4 }),
      clip({ id: "c", source: "stock", duration: 6 }),
    ]);
    expect(pacingCritique(d).length).toBe(0);
  });
});

describe("captionRhythmCritique", () => {
  const page = (startMs: number, endMs: number, words: number) => ({
    startMs,
    endMs,
    tokens: Array.from({ length: words }, (_, i) => ({ text: `w${i}`, fromMs: startMs, toMs: endMs, emphasis: "none" as const })),
    style: "clean",
    position: "bottom" as const,
  });

  it("flags reading speed that's too fast", () => {
    // 8 words in 1s = 8 wps
    const d = doc([clip({ duration: 10 })], "long", [page(0, 1000, 8)]);
    expect(captionRhythmCritique(d).some((n) => n.rule === "caption.readingSpeed")).toBe(true);
  });

  it("flags a flash page (< 0.6s)", () => {
    const d = doc([clip({ duration: 10 })], "long", [page(0, 300, 1)]);
    expect(captionRhythmCritique(d).some((n) => n.rule === "caption.flash")).toBe(true);
  });

  it("flags a long caption gap", () => {
    const d = doc([clip({ duration: 20 })], "long", [page(0, 1000, 3), page(9000, 10000, 3)]);
    expect(captionRhythmCritique(d).some((n) => n.rule === "caption.gap")).toBe(true);
  });

  it("no captions → no notes", () => {
    expect(captionRhythmCritique(doc([clip({})]))).toEqual([]);
  });
});

describe("craftCritique", () => {
  it("merges pacing + caption notes", () => {
    const d = doc([clip({ id: "a", duration: 20 }), clip({ id: "b", duration: 20 })], "long");
    expect(craftCritique(d).length).toBeGreaterThanOrEqual(pacingCritique(d).length);
  });
});

describe("diffToEditSignal (learning loop)", () => {
  it("detects shortening + fewer cuts", () => {
    const before = doc([clip({ id: "a", duration: 10 }), clip({ id: "b", duration: 10 })]);
    const after = doc([clip({ id: "a", duration: 6 })]);
    const s = diffToEditSignal(before, after);
    expect(s.tags).toContain("shortened");
    expect(s.tags).toContain("fewer-cuts");
  });

  it("detects removed transitions, medium, motion, and speed changes on matched clips", () => {
    const before = doc([clip({ id: "a", source: "still", motion: { kind: "none" }, transitionOut: { kind: "crossfade", sec: 0.4 } }), clip({ id: "b" })]);
    const after = doc([clip({ id: "a", source: "ai-clip", motion: { kind: "kenburns", fromScale: 1, toScale: 1.1, anchor: "center" }, speed: 2, transitionOut: { kind: "cut" } }), clip({ id: "b" })]);
    const s = diffToEditSignal(before, after);
    expect(s.tags).toEqual(expect.arrayContaining(["removed-transitions", "changed-medium", "changed-motion", "changed-speed"]));
  });

  it("no material change → empty tags", () => {
    const d = doc([clip({ id: "a" })]);
    expect(diffToEditSignal(d, d).tags).toEqual([]);
  });
});
