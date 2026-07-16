/**
 * Editor & Assembly R5 — clip speed ramp + keyframe ops. The model + render
 * already sample N-point eased keyframes; these ops let the inspector and the
 * MVDA (set_speed / add_keyframe tools) author them safely (endpoints stay
 * pinned, speed stays bounded, speed=1 clears the field so flag-off renders
 * are byte-identical).
 */
import { describe, expect, it } from "vitest";
import {
  setClipSpeed,
  addMotionKeyframe,
  updateMotionKeyframe,
  removeMotionKeyframe,
  validateEdd,
  type EddContext,
  type EditDocument,
} from "@studio/core";

const doc = (): EditDocument => ({
  meta: { schemaVersion: 1, format: "long", fps: 30, aspect: "16:9", targetDurationSec: 6 },
  intro: { sting: false, sec: 0 },
  outro: { endCard: false, sec: 0 },
  tracks: {
    video: [
      { id: "v1", beatIdx: 0, assetId: null, source: "ai-clip", start: 0, duration: 6, trim: { in: 0, out: 6 }, motion: { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" }, transitionOut: { kind: "cut" }, silent: true },
    ],
    audio: [],
    captions: [],
    overlays: [],
  },
});

const ctx = (d: EditDocument): EddContext => ({
  assets: [],
  beats: [{ idx: 0, hasText: false }],
  transitions: { cut: { maxSec: 0 } },
  captionStyles: new Set(["clean"]),
  sfxLibrary: new Set(),
  overlayStyles: new Set(),
  musicEnabled: false,
  toleranceSec: Math.max(2, d.meta.targetDurationSec * 0.05),
});

describe("setClipSpeed", () => {
  it("sets a bounded speed and keeps the doc valid", () => {
    const d = setClipSpeed(doc(), "v1", 2);
    expect(d.tracks.video[0].speed).toBe(2);
    expect(validateEdd(d, ctx(d)).ok).toBe(true);
  });

  it("clamps out-of-range values into [0.25, 4]", () => {
    expect(setClipSpeed(doc(), "v1", 10).tracks.video[0].speed).toBe(4);
    expect(setClipSpeed(doc(), "v1", 0.01).tracks.video[0].speed).toBe(0.25);
  });

  it("speed ~1 clears the field (flag-off byte-identical)", () => {
    const withSpeed = setClipSpeed(doc(), "v1", 1.5);
    const cleared = setClipSpeed(withSpeed, "v1", 1);
    expect(cleared.tracks.video[0].speed).toBeUndefined();
  });

  it("validateEdd rejects a manually out-of-range speed", () => {
    const d = doc();
    d.tracks.video[0].speed = 9;
    expect(validateEdd(d, ctx(d)).ok).toBe(false);
  });
});

describe("keyframe ops", () => {
  it("addMotionKeyframe converts a preset to a pinned keyframe track", () => {
    const d = addMotionKeyframe(doc(), "v1", { t: 3, scale: 1.2, x: 1, y: 0, ease: "easeInOut" });
    const m = d.tracks.video[0].motion;
    expect(m.kind).toBe("keyframes");
    if (m.kind === "keyframes") {
      expect(m.points.length).toBeGreaterThanOrEqual(3);
      expect(m.points[0].t).toBe(0);
      expect(m.points[m.points.length - 1].t).toBe(6); // pinned to clip duration
    }
    expect(validateEdd(d, ctx(d)).ok).toBe(true);
  });

  it("updateMotionKeyframe patches a point (endpoints stay pinned)", () => {
    let d = addMotionKeyframe(doc(), "v1", { t: 3, scale: 1.2, x: 0, y: 0, ease: "linear" });
    d = updateMotionKeyframe(d, "v1", 1, { ease: "easeOut", scale: 1.3 });
    const m = d.tracks.video[0].motion;
    if (m.kind === "keyframes") {
      expect(m.points[1].ease).toBe("easeOut");
      expect(m.points[1].scale).toBe(1.3);
      expect(m.points[0].t).toBe(0);
      expect(m.points[m.points.length - 1].t).toBe(6);
    }
    expect(validateEdd(d, ctx(d)).ok).toBe(true);
  });

  it("removeMotionKeyframe keeps at least two points", () => {
    let d = addMotionKeyframe(doc(), "v1", { t: 3, scale: 1.2, x: 0, y: 0, ease: "linear" });
    d = removeMotionKeyframe(d, "v1", 1); // back to 2 endpoints
    let m = d.tracks.video[0].motion;
    expect(m.kind === "keyframes" && m.points.length).toBe(2);
    // removing below 2 is a no-op
    d = removeMotionKeyframe(d, "v1", 0);
    m = d.tracks.video[0].motion;
    expect(m.kind === "keyframes" && m.points.length).toBe(2);
    expect(validateEdd(d, ctx(d)).ok).toBe(true);
  });
});
