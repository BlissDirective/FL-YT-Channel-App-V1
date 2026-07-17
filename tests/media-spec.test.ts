/**
 * Source-media inspection (#7) — the pure validator that rejects a malformed
 * generated clip (no stream / zero-length / truncated / too small) before it
 * reaches compile, and never false-rejects a healthy asset.
 */
import { describe, expect, it } from "vitest";
import { validateMediaSpec, type MediaSpec } from "@studio/core";

const clip = (over: Partial<MediaSpec> = {}): MediaSpec => ({
  hasVideo: true, hasAudio: false, width: 1280, height: 720,
  durationSec: 8, videoCodec: "h264", audioChannels: null, ...over,
});

describe("validateMediaSpec — clips", () => {
  it("passes a healthy clip near its target", () => {
    const v = validateMediaSpec(clip({ durationSec: 7.6 }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(true);
    expect(v.issues).toEqual([]);
  });

  it("rejects a clip with no video stream", () => {
    const v = validateMediaSpec(clip({ hasVideo: false }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("no_video");
  });

  it("rejects a zero-length clip", () => {
    const v = validateMediaSpec(clip({ durationSec: 0 }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("zero_duration");
  });

  it("rejects a truncated clip under half its target", () => {
    const v = validateMediaSpec(clip({ durationSec: 3 }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("too_short");
  });

  it("accepts a clip a little short of target (within tolerance)", () => {
    const v = validateMediaSpec(clip({ durationSec: 6 }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(true);
  });

  it("rejects a clip below the resolution floor", () => {
    const v = validateMediaSpec(clip({ width: 128, height: 96 }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("too_small");
  });

  it("rejects a clip with no readable dimensions", () => {
    const v = validateMediaSpec(clip({ width: null, height: null }), { kind: "clip", targetSec: 8 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("no_dimensions");
  });
});

describe("validateMediaSpec — stills", () => {
  it("does not require a video stream or duration for a still", () => {
    const v = validateMediaSpec(
      { hasVideo: false, hasAudio: false, width: 1024, height: 1024, durationSec: null, videoCodec: null, audioChannels: null },
      { kind: "still" },
    );
    expect(v.ok).toBe(true);
  });

  it("still rejects a too-small still", () => {
    const v = validateMediaSpec(
      { hasVideo: false, hasAudio: false, width: 64, height: 64, durationSec: null, videoCodec: null, audioChannels: null },
      { kind: "still" },
    );
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("too_small");
  });
});
