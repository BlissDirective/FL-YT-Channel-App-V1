import { execFileSync, spawnSync } from "node:child_process";
import { renameSync } from "node:fs";

/**
 * Loudness normalization for every finished render. YouTube normalizes loud
 * audio DOWN to about −14 LUFS but never boosts quiet audio. The first
 * directed Shorts came out at about −31 LUFS: the voice, SFX and music are
 * mixed at conservative levels and nothing raised the master.
 * This is a two-pass EBU R128 loudnorm to −14 LUFS integrated with a −1.5
 * dBTP ceiling. Video is stream-copied; only the audio is re-encoded (AAC
 * 192k). Non-fatal: any failure leaves the original file untouched.
 */
export const TARGET_LUFS = -14;
const TARGET_TP = -1.5;
const TARGET_LRA = 11;

type Measured = { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string };

/** Pure: pull loudnorm's JSON block out of ffmpeg's stderr. */
export function parseLoudnormJson(stderr: string): Measured | null {
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(stderr.slice(start, end + 1)) as Partial<Measured>;
    if (!j.input_i || !j.input_tp || !j.input_lra || !j.input_thresh || !j.target_offset) return null;
    if (!Number.isFinite(Number(j.input_i)) || Number(j.input_i) < -70) return null; // silent / unmeasurable
    return j as Measured;
  } catch {
    return null;
  }
}

function measure(file: string): Measured | null {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`, "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return parseLoudnormJson(r.stderr ?? "");
}

/** Normalize `file` in place. Returns the measured input loudness, or null if skipped. */
export function normalizeLoudness(file: string): { inputLufs: number } | null {
  try {
    const m = measure(file);
    if (!m) return null;
    const tmp = `${file}.norm.mp4`;
    const filter =
      `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}` +
      `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
      `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    execFileSync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp],
      { stdio: "ignore" },
    );
    renameSync(tmp, file);
    return { inputLufs: Number(m.input_i) };
  } catch (err) {
    console.error(`⚠️  loudness normalization skipped (non-fatal): ${String(err).slice(0, 160)}`);
    return null;
  }
}
