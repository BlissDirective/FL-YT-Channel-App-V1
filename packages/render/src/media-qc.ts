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
  id: "black" | "freeze" | "silence" | "loudness";
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

/** Build the verdict from parsed measurements (pure — the unit-tested core). */
export function evaluateMediaQc(parsed: {
  black: number[];
  silence: number[];
  freeze: number[];
  lufs: number | null;
  truePeakDb: number | null;
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

  return {
    ran: true,
    lufs,
    truePeakDb,
    checks,
    hardFail: checks.some((c) => c.hard),
  };
}

// ── The shelling-out driver ───────────────────────────────────────────

const SKIPPED: MediaQcResult = { ran: false, lufs: null, truePeakDb: null, checks: [], hardFail: false };

/**
 * Run one ffmpeg pass with black/freeze/silence/ebur128 filters and evaluate.
 * Never throws — a QC failure or a missing ffmpeg returns a benign result so
 * a successful render is never lost.
 */
export async function runMediaQc(filePath: string): Promise<MediaQcResult> {
  try {
    const stderr = await ffmpegStderr(filePath);
    if (stderr == null) return SKIPPED;
    return evaluateMediaQc({
      black: parseBlackSeconds(stderr),
      silence: parseSilenceSeconds(stderr),
      freeze: parseFreezeSeconds(stderr),
      ...parseLoudness(stderr),
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
