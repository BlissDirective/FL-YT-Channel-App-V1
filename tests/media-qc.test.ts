/**
 * media-qc.ts — the free ffmpeg structural QC layer (Harness C6). The parsers
 * and evaluator are pure functions of ffmpeg stderr, so they test without a
 * binary; they gate whether a rendered video auto-publishes or holds.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateFrame,
  evaluateMediaQc,
  parseBlackSeconds,
  parseFreezeSeconds,
  parseLoudness,
  parseProbe,
  parseSilenceSeconds,
  type ParsedProbe,
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

  it("adds no new checks when frames/probe/captions are absent (legacy)", () => {
    const r = evaluateMediaQc(clean);
    const ids = r.checks.map((c) => c.id);
    expect(ids).not.toContain("frames");
    expect(ids).not.toContain("audio");
    expect(ids).not.toContain("subtitles");
  });
});

// ── #6 additions: ffprobe structural + 4-position frames + subtitles ──────

describe("parseProbe", () => {
  const doc = JSON.stringify({
    format: { duration: "63.5" },
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080 },
      { codec_type: "audio", codec_name: "aac", channels: 2 },
    ],
  });

  it("summarises duration, resolution, and streams", () => {
    const p = parseProbe(doc);
    expect(p.durationSec).toBeCloseTo(63.5, 5);
    expect(p.width).toBe(1920);
    expect(p.height).toBe(1080);
    expect(p.hasVideo).toBe(true);
    expect(p.hasAudio).toBe(true);
    expect(p.audioChannels).toBe(2);
    expect(p.subtitleStreams).toBe(0);
  });

  it("counts soft subtitle streams and detects a missing audio track", () => {
    const p = parseProbe(
      JSON.stringify({
        format: { duration: "10" },
        streams: [
          { codec_type: "video", width: 1080, height: 1920 },
          { codec_type: "subtitle" },
        ],
      }),
    );
    expect(p.hasAudio).toBe(false);
    expect(p.subtitleStreams).toBe(1);
  });

  it("returns a benign summary on malformed json", () => {
    const p = parseProbe("not json");
    expect(p.hasVideo).toBe(false);
    expect(p.durationSec).toBeNull();
  });
});

describe("evaluateFrame", () => {
  it("flags a near-uniform frame as blank", () => {
    expect(evaluateFrame(0.35, 2, 1).blank).toBe(true); // near-black solid
    expect(evaluateFrame(0.62, 128, 3).blank).toBe(true); // solid mid-grey
  });
  it("passes a textured frame with real content", () => {
    expect(evaluateFrame(0.08, 120, 900).blank).toBe(false);
  });
});

describe("evaluateMediaQc — #6 checks", () => {
  const clean = { black: [], silence: [], freeze: [], lufs: -14.5, truePeakDb: -1.5 };
  const probe = (over: Partial<ParsedProbe> = {}): ParsedProbe => ({
    durationSec: 60, width: 1920, height: 1080, hasVideo: true, hasAudio: true,
    subtitleStreams: 0, videoCodec: "h264", audioChannels: 2, ...over,
  });

  it("hard-fails when 2+ sampled frames are blank", () => {
    const r = evaluateMediaQc({
      ...clean,
      frames: [
        evaluateFrame(0.08, 120, 800),
        evaluateFrame(0.35, 2, 1),
        evaluateFrame(0.62, 128, 2),
        evaluateFrame(0.9, 110, 700),
      ],
    });
    const f = r.checks.find((c) => c.id === "frames");
    expect(f?.pass).toBe(false);
    expect(r.hardFail).toBe(true);
  });

  it("does not hard-fail a single stylistic blank frame", () => {
    const r = evaluateMediaQc({
      ...clean,
      frames: [
        evaluateFrame(0.08, 120, 800),
        evaluateFrame(0.35, 2, 1),
        evaluateFrame(0.62, 128, 600),
        evaluateFrame(0.9, 110, 700),
      ],
    });
    expect(r.checks.find((c) => c.id === "frames")?.pass).toBe(false);
    expect(r.hardFail).toBe(false);
  });

  it("hard-fails a render with no audio track", () => {
    const r = evaluateMediaQc({ ...clean, probe: probe({ hasAudio: false }) });
    const a = r.checks.find((c) => c.id === "audio");
    expect(a?.pass).toBe(false);
    expect(r.hardFail).toBe(true);
  });

  it("reports caption intent as an advisory (never hard)", () => {
    const r = evaluateMediaQc({ ...clean, probe: probe(), captions: { expected: true } });
    const s = r.checks.find((c) => c.id === "subtitles");
    expect(s?.pass).toBe(true);
    expect(s?.hard).toBe(false);
    expect(s?.note).toMatch(/burned into the frames/i);
    expect(r.hardFail).toBe(false);
  });

  it("notes soft subtitle streams when present", () => {
    const r = evaluateMediaQc({ ...clean, probe: probe({ subtitleStreams: 1 }), captions: { expected: false } });
    expect(r.checks.find((c) => c.id === "subtitles")?.note).toMatch(/subtitle stream/i);
  });
});
