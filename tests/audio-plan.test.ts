/**
 * Music plan, ducking & voice direction (Batch 6). Pure planning — decided at
 * proposal time, not deferred to render.
 */
import { describe, expect, it } from "vitest";
import { planMusic, voiceDirectionForBeat, DEFAULT_VO_CLEANUP } from "@studio/core";

describe("planMusic", () => {
  it("picks a mood from the niche and a sidechain duck", () => {
    const p = planMusic({ niche: "ancient history", motionIntensity: 2, musicEnabled: true });
    expect(p.mood).toBe("epic");
    expect(p.duck.mode).toBe("sidechain");
    expect(p.enabled).toBe(true);
    expect(p.prompt).toMatch(/instrumental/);
  });
  it("runs a Short hotter (higher intensity + tempo)", () => {
    const long = planMusic({ niche: "x", motionIntensity: 2, kind: "long" });
    const short = planMusic({ niche: "x", motionIntensity: 2, kind: "short" });
    expect(short.intensity).toBeGreaterThan(long.intensity);
    expect(short.tempoBpm).toBeGreaterThan(long.tempoBpm);
  });
  it("defaults to disabled when music isn't enabled", () => {
    expect(planMusic({ niche: "x" }).enabled).toBe(false);
  });
});

describe("voiceDirectionForBeat", () => {
  it("gives the hook an excited, brisk read with more emphasis", () => {
    const d = voiceDirectionForBeat({ idx: 0, text: "Here's the wildest fact." }, 3);
    expect(d.emotion).toBe("excited");
    expect(d.pace).toBe("brisk");
    expect(d.emphasis).toBeGreaterThan(0.5);
  });
  it("reads a statistic beat as authoritative", () => {
    const d = voiceDirectionForBeat({ idx: 3, text: "Revenue grew 47% in a year." });
    expect(d.emotion).toBe("authoritative");
  });
  it("reads a question warmly", () => {
    const d = voiceDirectionForBeat({ idx: 2, text: "But why did it collapse?" });
    expect(d.emotion).toBe("warm");
  });
  it("always returns a usable cue", () => {
    expect(voiceDirectionForBeat({ idx: 5, text: "A plain statement." }).cue.length).toBeGreaterThan(0);
  });
});

describe("VO cleanup defaults", () => {
  it("targets the media-QC loudness band", () => {
    expect(DEFAULT_VO_CLEANUP.targetLufs).toBeLessThanOrEqual(-14);
    expect(DEFAULT_VO_CLEANUP.targetLufs).toBeGreaterThanOrEqual(-16);
  });
});
