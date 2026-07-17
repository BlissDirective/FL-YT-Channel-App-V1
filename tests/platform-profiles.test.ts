/**
 * Platform output profiles + multi-aspect render (Batch 7). Pure preset lookup
 * + the one-plan-to-many-aspects expansion.
 */
import { describe, expect, it } from "vitest";
import {
  defaultProfilesFor,
  fitsProfileDuration,
  getPlatformProfile,
  multiAspectTargets,
  PLATFORM_PROFILES,
  profilesByAspect,
} from "@studio/core";

describe("platform profiles", () => {
  it("every profile has sane dimensions matching its aspect family", () => {
    for (const p of PLATFORM_PROFILES) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      if (p.aspect === "9:16") expect(p.height).toBeGreaterThan(p.width);
      if (p.aspect === "16:9" || p.aspect === "21:9") expect(p.width).toBeGreaterThan(p.height);
      if (p.aspect === "1:1") expect(p.width).toBe(p.height);
    }
  });
  it("groups by aspect", () => {
    expect(profilesByAspect("9:16").length).toBeGreaterThanOrEqual(3);
  });
  it("defaults long → 16:9, short → 9:16", () => {
    expect(defaultProfilesFor("long")[0].aspect).toBe("16:9");
    expect(defaultProfilesFor("short")[0].aspect).toBe("9:16");
  });
});

describe("multiAspectTargets — one plan, many aspects", () => {
  it("dedupes by aspect (TikTok + Reels + Short = one 9:16 render)", () => {
    const targets = multiAspectTargets(["youtube-long", "tiktok", "reels", "youtube-short"]);
    expect(targets.map((t) => t.aspect).sort()).toEqual(["16:9", "9:16"]);
  });
  it("ignores unknown profile ids", () => {
    expect(multiAspectTargets(["nope", "cinema"]).map((t) => t.aspect)).toEqual(["21:9"]);
  });
});

describe("fitsProfileDuration", () => {
  it("enforces the platform ceiling", () => {
    expect(fitsProfileDuration(getPlatformProfile("reels")!, 200)).toBe(false);
    expect(fitsProfileDuration(getPlatformProfile("reels")!, 60)).toBe(true);
    expect(fitsProfileDuration(getPlatformProfile("youtube-long")!, 6000)).toBe(true);
  });
});
