/**
 * media-qc.ts — the free ffmpeg structural QC layer (Harness C6). The parsers
 * and evaluator are pure functions of ffmpeg stderr, so they test without a
 * binary; they gate whether a rendered video auto-publishes or holds.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateMediaQc,
  parseBlackSeconds,
  parseFreezeSeconds,
  parseLoudness,
  parseSilenceSeconds,
} from "../packages/render/src/media-qc";

describe("parsers", () => {
  it("sums blackdetect segment durations", () => {
    const stderr =
      "[blackdetect] black_start:1.0 black_end:1.8 black_duration:0.8\n" +
      "[blackdetect] black_start:10.0 black_end:10.2 black_duration:0.2";
    const secs = parseBlackSeconds(stderr);
    expect(secs).toHaveLength(2);
    expect(secs[0]).toBeCloseTo(0.8, 5);
    expect(secs[1]).toBeCloseTo(0.2, 5);
  });

  it("reads silence_duration lines", () => {
    const stderr =
      "[silencedetect] silence_end: 5.2 | silence_duration: 2.1\n" +
      "[silencedetect] silence_end: 9.0 | silence_duration: 0.4";
    expect(parseSilenceSeconds(stderr)).toEqual([2.1, 0.4]);
  });

  it("computes freeze durations from start/end", () => {
    const stderr = "[freezedetect] freeze_start: 3.0\n[freezedetect] freeze_end: 6.5";
    expect(parseFreezeSeconds(stderr)).toEqual([3.5]);
  });

  it("takes the final ebur128 summary loudness + peak", () => {
    const stderr =
      "Parsed_ebur128 I: -20.0 LUFS\n" + // interim
      "Summary:\n  Integrated loudness:\n    I:         -14.3 LUFS\n" +
      "  True peak:\n    Peak:       -1.4 dBFS";
    expect(parseLoudness(stderr)).toEqual({ lufs: -14.3, truePeakDb: -1.4 });
  });

  it("returns nulls when loudness is absent", () => {
    expect(parseLoudness("no audio")).toEqual({ lufs: null, truePeakDb: null });
  });
});

describe("evaluateMediaQc", () => {
  const clean = { black: [], silence: [], freeze: [], lufs: -14.5, truePeakDb: -1.5 };

  it("passes a clean render with no hard failures", () => {
    const r = evaluateMediaQc(clean);
    expect(r.hardFail).toBe(false);
    expect(r.checks.every((c) => c.pass)).toBe(true);
    expect(r.lufs).toBe(-14.5);
  });

  it("hard-fails a long black stretch", () => {
    const r = evaluateMediaQc({ ...clean, black: [0.9] });
    expect(r.hardFail).toBe(true);
    expect(r.checks.find((c) => c.id === "black")?.pass).toBe(false);
  });

  it("hard-fails a >1.5s silence gap", () => {
    const r = evaluateMediaQc({ ...clean, silence: [2.0] });
    expect(r.hardFail).toBe(true);
  });

  it("does not hard-fail a short black blip below the threshold", () => {
    const r = evaluateMediaQc({ ...clean, black: [0.3] });
    expect(r.hardFail).toBe(false);
  });

  it("flags out-of-band loudness but never hard-fails on it", () => {
    const quiet = evaluateMediaQc({ ...clean, lufs: -22 });
    const loud = evaluateMediaQc({ ...clean, truePeakDb: 0.5 });
    expect(quiet.checks.find((c) => c.id === "loudness")?.pass).toBe(false);
    expect(loud.checks.find((c) => c.id === "loudness")?.pass).toBe(false);
    expect(quiet.hardFail).toBe(false);
    expect(loud.hardFail).toBe(false);
  });

  it("treats a freeze as a warning, not a hold", () => {
    const r = evaluateMediaQc({ ...clean, freeze: [3.0] });
    expect(r.checks.find((c) => c.id === "freeze")?.pass).toBe(false);
    expect(r.hardFail).toBe(false);
  });
});
