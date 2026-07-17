import { spawn } from "node:child_process";

/**
 * Two-layer media QC, layer one (Harness C6, Fable5-Agentic-Harness-Plan.md).
 *
 * A single ffmpeg pass over the finished MP4 detects the structural defects
 * a vision model can't reliably see and that are pure quality/policy risks on
 * a faceless channel: black frames, frozen frames, audio silence gaps, and
 * loudness drift. It's free (no tokens), runs on EVERY render, and gates the
 * expensive vision critique — which now only needs to run when this flags, or
 * on the final pre-publish pass.
 *
 * The parsers are pure functions of ffmpeg's stderr so they unit-test without
 * a binary; `runMediaQc` shells out and degrades to `skipped` when ffmpeg is
 * absent (it must NEVER fail a render that already succeeded).
 */

export type MediaQcCheck = {
  id: "black" | "freeze" | "silence" | "loudness" | "frames" | "audio" | "subtitles";
  pass: boolean;
  /** true only for defects bad enough to hold the video for a human. */
  hard: boolean;
  note: string;
};

export type MediaQcResult = {
  ran: boolean;
  /** Integrated loudness (LUFS) and true peak (dBTP), null when unmeasured. */
  lufs: number | null;
  truePeakDb: number | null;
  checks: MediaQcCheck[];
  /** Any hard failure → the render should hold rather than auto-publish. */
  hardFail: boolean;
  /** ffprobe structural summary (null when ffprobe didn't run). */
  probe?: ParsedProbe | null;
  /** Per-position frame samples (empty when frame sampling didn't run). */
  frames?: FrameSample[];
};

/** ffprobe structural summary — the "source-media inspection" of the OUTPUT. */
export type ParsedProbe = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  /** Count of soft subtitle streams (burned-in captions are NOT counted). */
  subtitleStreams: number;
  videoCodec: string | null;
  audioChannels: number | null;
};

/** One sampled frame's luminance stats (0..255 mean, variance) at a position. */
export type FrameSample = {
  /** Fraction of the video's duration this frame was taken at (0..1). */
  atPct: number;
  mean: number;
  variance: number;
  /** A near-uniform frame (solid colour / black / white) — no real content. */
  blank: boolean;
};

// YouTube normalizes loudness DOWN to ~-14 LUFS and never boosts quiet audio,
// so aim for the -14..-16 band; below -16 plays quiet, true peak must clear -1.
const LUFS_MIN = -16.5;
const LUFS_MAX = -12.5;
const TRUE_PEAK_MAX_DB = -1.0;
// Defect thresholds.
const BLACK_MIN_SEC = 0.5; // a black stretch this long mid-video is a defect
const SILENCE_MIN_SEC = 1.5; // matches the plan's ">1.5s silence" gate
const FREEZE_MIN_SEC = 2.0;

// ── Pure parsers over ffmpeg stderr ───────────────────────────────────

/** Sum the durations of `blackdetect` segments (`black_start`/`black_end`). */
export function parseBlackSeconds(stderr: string): number[] {
  const out: number[] = [];
  const re = /black_start:([0-9.]+)\s+black_end:([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stderr))) out.push(Number(m[2]) - Number(m[1]));
  return out.filter((d) => d > 0);
}

/** `silencedetect` reports `silence_duration` on each silence_end line. */
export function parseSilenceSeconds(stderr: string): number[] {
  const out: number[] = [];
  const re = /silence_duration:\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stderr))) out.push(Number(m[1]));
  return out.filter((d) => d > 0);
}

/** `freezedetect` emits `freeze_start`/`freeze_end` (seconds). */
export function parseFreezeSeconds(stderr: string): number[] {
  const out: number[] = [];
  const re = /freeze_start:\s*([0-9.]+)[\s\S]*?freeze_end:\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stderr))) out.push(Number(m[2]) - Number(m[1]));
  return out.filter((d) => d > 0);
}

/** ebur128 prints a Summary block with `I:` (integrated LUFS) and `Peak:`. */
export function parseLoudness(stderr: string): { lufs: number | null; truePeakDb: number | null } {
  // Prefer the final Summary values (last match wins).
  const lufsMatches = [...stderr.matchAll(/I:\s*(-?[0-9.]+)\s*LUFS/g)];
  const peakMatches = [...stderr.matchAll(/Peak:\s*(-?[0-9.]+)\s*dBFS/g)];
  const lufs = lufsMatches.length ? Number(lufsMatches[lufsMatches.length - 1][1]) : null;
  const truePeakDb = peakMatches.length ? Number(peakMatches[peakMatches.length - 1][1]) : null;
  return {
    lufs: lufs != null && Number.isFinite(lufs) ? lufs : null,
    truePeakDb: truePeakDb != null && Number.isFinite(truePeakDb) ? truePeakDb : null,
  };
}

// A sampled frame this uniform has no real content (solid colour / black /
// white) — a broken or truncated render. Real footage/graphics have texture.
const FRAME_BLANK_VARIANCE = 8;
// Hold the render only when MULTIPLE sampled positions are blank (a single
// stylistic solid frame — e.g. a plain title card at one instant — shouldn't
// hold an otherwise-good render).
const FRAME_BLANK_HARD_COUNT = 2;

/** Parse ffprobe's `-show_format -show_streams -print_format json` output. Pure
    over the JSON string; returns a benign summary on malformed input. */
export function parseProbe(json: string): ParsedProbe {
  const empty: ParsedProbe = {
    durationSec: null, width: null, height: null, hasVideo: false, hasAudio: false,
    subtitleStreams: 0, videoCodec: null, audioChannels: null,
  };
  let doc: { format?: { duration?: string }; streams?: Record<string, unknown>[] };
  try {
    doc = JSON.parse(json);
  } catch {
    return empty;
  }
  const streams = Array.isArray(doc.streams) ? doc.streams : [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle").length;
  const dur = Number(doc.format?.duration);
  return {
    durationSec: Number.isFinite(dur) ? dur : null,
    width: video ? Number(video.width) || null : null,
    height: video ? Number(video.height) || null : null,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    subtitleStreams,
    videoCodec: video ? (video.codec_name as string) ?? null : null,
    audioChannels: audio ? Number(audio.channels) || null : null,
  };
}

/** Classify one frame's luma stats as blank (no real content) or not. Pure. */
export function evaluateFrame(atPct: number, mean: number, variance: number): FrameSample {
  return { atPct, mean, variance, blank: variance < FRAME_BLANK_VARIANCE };
}

/** Build the verdict from parsed measurements (pure — the unit-tested core).
    `frames`, `probe`, and `captions` are optional so legacy callers (black/
    silence/loudness only) keep their exact behaviour. */
export function evaluateMediaQc(parsed: {
  black: number[];
  silence: number[];
  freeze: number[];
  lufs: number | null;
  truePeakDb: number | null;
  frames?: FrameSample[];
  probe?: ParsedProbe | null;
  captions?: { expected: boolean };
}): MediaQcResult {
  const checks: MediaQcCheck[] = [];

  const worstBlack = Math.max(0, ...parsed.black);
  checks.push({
    id: "black",
    pass: worstBlack < BLACK_MIN_SEC,
    hard: worstBlack >= BLACK_MIN_SEC,
    note: worstBlack >= BLACK_MIN_SEC
      ? `Black frames up to ${worstBlack.toFixed(1)}s — a rendering defect.`
      : "No black frames.",
  });

  const worstSilence = Math.max(0, ...parsed.silence);
  checks.push({
    id: "silence",
    pass: worstSilence < SILENCE_MIN_SEC,
    hard: worstSilence >= SILENCE_MIN_SEC,
    note: worstSilence >= SILENCE_MIN_SEC
      ? `Silence gap up to ${worstSilence.toFixed(1)}s — VO likely missing on a beat.`
      : "No long silence gaps.",
  });

  const worstFreeze = Math.max(0, ...parsed.freeze);
  checks.push({
    id: "freeze",
    // A freeze is a warning (some intentional holds exist), not a hard hold.
    pass: worstFreeze < FREEZE_MIN_SEC,
    hard: false,
    note: worstFreeze >= FREEZE_MIN_SEC
      ? `Frozen frame up to ${worstFreeze.toFixed(1)}s — check the beat.`
      : "No frozen frames.",
  });

  const { lufs, truePeakDb } = parsed;
  const lufsOk = lufs == null || (lufs >= LUFS_MIN && lufs <= LUFS_MAX);
  const peakOk = truePeakDb == null || truePeakDb <= TRUE_PEAK_MAX_DB;
  checks.push({
    id: "loudness",
    pass: lufsOk && peakOk,
    hard: false, // loudness is advisory — YouTube re-normalizes, but flag drift
    note:
      lufs == null
        ? "Loudness not measured (no audio track?)."
        : `Integrated ${lufs.toFixed(1)} LUFS` +
          (truePeakDb != null ? `, peak ${truePeakDb.toFixed(1)} dBTP` : "") +
          (lufsOk && peakOk ? " — in target band." : ` — outside -14..-16 LUFS / -1 dBTP target.`),
  });

  // Frames at N positions (#6): a broken/truncated render reads as blank frames
  // spread through the video that the black-STRETCH detector can miss.
  if (parsed.frames && parsed.frames.length > 0) {
    const blanks = parsed.frames.filter((f) => f.blank);
    checks.push({
      id: "frames",
      pass: blanks.length === 0,
      hard: blanks.length >= FRAME_BLANK_HARD_COUNT,
      note: blanks.length === 0
        ? `Content present at all ${parsed.frames.length} sampled positions.`
        : `${blanks.length}/${parsed.frames.length} sampled frames are blank (at ${blanks
            .map((f) => `${Math.round(f.atPct * 100)}%`)
            .join(", ")}) — a broken or truncated render.`,
    });
  }

  // Audio track presence (#6, ffprobe): a narration video with no audio stream
  // is broken — a silent upload. Hard-hold it.
  if (parsed.probe) {
    checks.push({
      id: "audio",
      pass: parsed.probe.hasAudio,
      hard: !parsed.probe.hasAudio,
      note: parsed.probe.hasAudio
        ? `Audio track present (${parsed.probe.audioChannels ?? "?"}ch).`
        : "No audio track in the render — a silent video.",
    });
  }

  // Subtitle / caption presence (#6): report soft subtitle streams from ffprobe
  // and reconcile against the caption intent. Burned-in captions carry no
  // subtitle stream, so this is advisory (never a hard hold).
  if (parsed.captions || (parsed.probe && parsed.probe.subtitleStreams > 0)) {
    const soft = parsed.probe?.subtitleStreams ?? 0;
    const expected = parsed.captions?.expected ?? false;
    checks.push({
      id: "subtitles",
      pass: true,
      hard: false,
      note: soft > 0
        ? `${soft} subtitle stream${soft === 1 ? "" : "s"} present.`
        : expected
          ? "Captions enabled — burned into the frames (no separate subtitle stream)."
          : "Captions disabled for this video.",
    });
  }

  return {
    ran: true,
    lufs,
    truePeakDb,
    checks,
    hardFail: checks.some((c) => c.hard),
    probe: parsed.probe ?? null,
    frames: parsed.frames ?? [],
  };
}

// ── The shelling-out driver ───────────────────────────────────────────

const SKIPPED: MediaQcResult = { ran: false, lufs: null, truePeakDb: null, checks: [], hardFail: false };

/**
 * Post-render technical self-review (#6): the ffmpeg detector pass (black /
 * freeze / silence / loudness) PLUS an ffprobe structural probe and frame
 * sampling at four positions, evaluated into one verdict. Never throws — any
 * step that can't run (missing ffmpeg/ffprobe) degrades gracefully so a
 * successful render is never lost.
 */
export async function runMediaQc(
  filePath: string,
  opts?: { captionsExpected?: boolean },
): Promise<MediaQcResult> {
  try {
    const stderr = await ffmpegStderr(filePath);
    if (stderr == null) return SKIPPED;
    // ffprobe structural probe first (also gives us the duration for frame
    // positions); frame sampling second. Both are best-effort.
    const probe = await probeMedia(filePath);
    const frames = probe?.durationSec
      ? await sampleFrameBlanks(filePath, probe.durationSec)
      : [];
    return evaluateMediaQc({
      black: parseBlackSeconds(stderr),
      silence: parseSilenceSeconds(stderr),
      freeze: parseFreezeSeconds(stderr),
      ...parseLoudness(stderr),
      probe,
      frames,
      captions: opts?.captionsExpected != null ? { expected: opts.captionsExpected } : undefined,
    });
  } catch (err) {
    console.error(`media QC skipped: ${String(err).slice(0, 120)}`);
    return SKIPPED;
  }
}

/** Run ffmpeg to null, capturing the detector logs from stderr. */
function ffmpegStderr(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const args = [
      "-hide_banner",
      "-nostats",
      "-i",
      filePath,
      "-vf",
      "blackdetect=d=0.3:pix_th=0.10,freezedetect=n=-60dB:d=2",
      "-af",
      "silencedetect=noise=-45dB:d=1.0,ebur128=peak=true",
      "-f",
      "null",
      "-",
    ];
    let stderr = "";
    let done = false;
    const finish = (v: string | null) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    let child;
    try {
      child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    } catch {
      return finish(null); // ffmpeg not installed
    }
    child.on("error", () => finish(null)); // ENOENT etc.
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", () => finish(stderr));
    // Hard ceiling so a hung ffmpeg can't stall the worker.
    setTimeout(() => {
      try {
        child?.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      finish(stderr || null);
    }, 120_000);
  });
}

/** Run ffprobe for the structural summary. Resolves null when ffprobe is
    absent or errors (never throws). */
function probeMedia(filePath: string): Promise<ParsedProbe | null> {
  return new Promise((resolve) => {
    const args = [
      "-hide_banner", "-loglevel", "error",
      "-show_format", "-show_streams", "-print_format", "json",
      filePath,
    ];
    let stdout = "";
    let done = false;
    const finish = (v: ParsedProbe | null) => {
      if (!done) { done = true; resolve(v); }
    };
    let child;
    try {
      child = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return finish(null);
    }
    child.on("error", () => finish(null));
    child.stdout?.on("data", (d) => { stdout += String(d); });
    child.on("close", () => finish(stdout ? parseProbe(stdout) : null));
    setTimeout(() => {
      try { child?.kill("SIGKILL"); } catch { /* gone */ }
      finish(stdout ? parseProbe(stdout) : null);
    }, 30_000);
  });
}

/** Frame positions sampled for the "content present throughout" check — spread
    across the body, avoiding the very start/end (intro/outro fades). */
const FRAME_POSITIONS = [0.08, 0.35, 0.62, 0.9];

/** Extract one 16×16 grayscale frame at each position and compute its luma
    mean + variance, classifying blank frames. ffmpeg-only (no image lib):
    each frame is 256 raw luma bytes on stdout. Best-effort → [] on failure. */
async function sampleFrameBlanks(filePath: string, durationSec: number): Promise<FrameSample[]> {
  const out: FrameSample[] = [];
  for (const atPct of FRAME_POSITIONS) {
    const t = Math.max(0, Math.min(durationSec - 0.1, durationSec * atPct));
    const bytes = await extractGrayFrame(filePath, t);
    if (!bytes || bytes.length === 0) continue;
    let sum = 0;
    for (const b of bytes) sum += b;
    const mean = sum / bytes.length;
    let sq = 0;
    for (const b of bytes) sq += (b - mean) * (b - mean);
    const variance = sq / bytes.length;
    out.push(evaluateFrame(atPct, Math.round(mean * 10) / 10, Math.round(variance * 10) / 10));
  }
  return out;
}

/** ffmpeg: seek to `t`, take one frame, scale to 16×16 gray, emit raw bytes. */
function extractGrayFrame(filePath: string, t: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const args = [
      "-hide_banner", "-loglevel", "error",
      "-ss", t.toFixed(2), "-i", filePath,
      "-frames:v", "1",
      "-vf", "scale=16:16,format=gray",
      "-f", "rawvideo", "-",
    ];
    const chunks: Buffer[] = [];
    let done = false;
    const finish = (v: Buffer | null) => { if (!done) { done = true; resolve(v); } };
    let child;
    try {
      child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return finish(null);
    }
    child.on("error", () => finish(null));
    child.stdout?.on("data", (d: Buffer) => chunks.push(d));
    child.on("close", () => finish(chunks.length ? Buffer.concat(chunks) : null));
    setTimeout(() => {
      try { child?.kill("SIGKILL"); } catch { /* gone */ }
      finish(chunks.length ? Buffer.concat(chunks) : null);
    }, 20_000);
  });
}
