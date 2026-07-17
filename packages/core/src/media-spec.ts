/**
 * Source-media inspection (OpenMontage Remixed #7).
 *
 * A pure validator that checks a GENERATED asset's real technical spec
 * (resolution, codec, duration, audio channels) against what the pipeline
 * expects, BEFORE the asset reaches compile. A malformed generative clip — a
 * truncated Seedance render, a zero-duration file, a still that came back the
 * wrong size — is rejected here so it can be re-rolled, rather than silently
 * poisoning the final cut.
 *
 * Pure (no I/O) so the worker can probe with ffprobe and hand the parsed spec
 * to this for a deterministic, unit-tested verdict. Same "never false-reject"
 * ethos as the rest of the QC stack: it only rejects CLEARLY broken media.
 */

export type MediaSpec = {
  /** true if the file has a decodable video stream. */
  hasVideo: boolean;
  hasAudio: boolean;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  videoCodec: string | null;
  audioChannels: number | null;
};

export type MediaSpecExpectation = {
  kind: "clip" | "still";
  /** Target duration (clips only) — the file may run a little short/long. */
  targetSec?: number;
  /** Minimum acceptable dimensions (defaults to a sane floor). */
  minWidth?: number;
  minHeight?: number;
  /** A clip shorter than this fraction of target is treated as truncated. */
  minDurationFrac?: number;
  /** Clips must carry a moving video stream; stills are single frames. */
  requireVideoStream?: boolean;
};

export type MediaSpecIssue = {
  code: "no_video" | "zero_duration" | "too_short" | "too_small" | "no_dimensions";
  note: string;
};

export type MediaSpecVerdict = {
  ok: boolean;
  issues: MediaSpecIssue[];
  spec: MediaSpec;
};

const DEFAULT_MIN_W = 256;
const DEFAULT_MIN_H = 256;
const DEFAULT_MIN_DUR_FRAC = 0.5;

/**
 * Validate a probed asset against its expectation. Rejects only clearly broken
 * media (no stream / zero-length / truncated to under half the target /
 * far-too-small frame). Everything else passes.
 */
export function validateMediaSpec(
  spec: MediaSpec,
  expect: MediaSpecExpectation,
): MediaSpecVerdict {
  const issues: MediaSpecIssue[] = [];
  const minW = expect.minWidth ?? DEFAULT_MIN_W;
  const minH = expect.minHeight ?? DEFAULT_MIN_H;
  const requireVideo = expect.requireVideoStream ?? expect.kind === "clip";

  if (requireVideo && !spec.hasVideo) {
    issues.push({ code: "no_video", note: "No decodable video stream — the render failed or is corrupt." });
  }

  if (spec.width == null || spec.height == null) {
    // A clip with no readable dimensions is broken; a still might just be
    // unprobed metadata — only hard-reject clips.
    if (expect.kind === "clip") {
      issues.push({ code: "no_dimensions", note: "No readable frame dimensions." });
    }
  } else if (spec.width < minW || spec.height < minH) {
    issues.push({
      code: "too_small",
      note: `Frame ${spec.width}×${spec.height} is below the ${minW}×${minH} floor.`,
    });
  }

  if (expect.kind === "clip") {
    const dur = spec.durationSec;
    if (dur == null || dur <= 0.1) {
      issues.push({ code: "zero_duration", note: "Zero-length clip — nothing was rendered." });
    } else if (expect.targetSec && expect.targetSec > 0) {
      const frac = expect.minDurationFrac ?? DEFAULT_MIN_DUR_FRAC;
      if (dur < expect.targetSec * frac) {
        issues.push({
          code: "too_short",
          note: `Clip is ${dur.toFixed(1)}s — under ${Math.round(frac * 100)}% of the ${expect.targetSec}s target (truncated).`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues, spec };
}
