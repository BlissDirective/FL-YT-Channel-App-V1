import {
  type ProviderCandidate,
} from "@studio/core";
import type { AutoTier } from "./auto-tiers";
import type { CustomSpec } from "@/lib/db/types";
import { VIDEO_MODELS, getVideoModel, type VideoModel } from "./video-models";

/**
 * Client-safe half of the scored provider selector (#1): the pure mapping from
 * the VIDEO_MODELS catalog into the core scorer's candidate shape, plus the
 * per-tier candidate pools. No I/O, no `server-only` — so both the server
 * selector (provider-selector.ts) and the UI scoreboard share ONE definition of
 * a model's priors.
 */

/** Provider family for continuity + health keying (derived from the model id). */
export function modelFamily(id: string): string {
  if (id.startsWith("seedance")) return "seedance";
  if (id.startsWith("kling")) return "kling";
  if (id.startsWith("veo")) return "veo";
  if (id.startsWith("ltx")) return "ltx";
  if (id.startsWith("wan")) return "wan";
  return id.split("-")[0] || id;
}

export const QUALITY_PRIOR: Record<VideoModel["quality"], number> = {
  draft: 0.4,
  standard: 0.7,
  premium: 1,
};

/** Map a catalog model into the scorer's normalised candidate (priors 0..1). */
export function toCandidate(m: VideoModel): ProviderCandidate {
  const fast = /fast/i.test(m.id);
  const speed = fast ? 1 : m.quality === "premium" ? 0.35 : 0.7;
  const control = Math.min(
    1,
    0.55 + (m.durations?.length ? 0.1 : 0) + (m.audio ? 0.1 : 0) + QUALITY_PRIOR[m.quality] * 0.15,
  );
  return {
    id: m.id,
    label: m.label,
    family: modelFamily(m.id),
    quality: QUALITY_PRIOR[m.quality],
    control,
    reliability: 0.9,
    speed,
    usdPerSec: m.usdPerSec,
    audio: m.audio,
    minDurationSec: m.minDurationSec,
    maxDurationSec: m.maxDurationSec,
    longClip: m.longClip,
  };
}

/** The candidate pool a tier draws from (keeps Economy cheap; premium tiers can
    reach the hero models). Always includes the tier's own default. */
export function tierCandidateIds(tier: AutoTier, custom?: CustomSpec): string[] {
  switch (tier) {
    case "economy":
      return ["seedance-2-fast", "ltx-2"];
    case "premium":
      return ["seedance-2-fast", "seedance-2", "ltx-2", "kling-2-5-turbo"];
    case "platinum":
    case "director":
      return ["seedance-2-fast", "seedance-2", "kling-2-5-turbo", "ltx-2", "wan-2-2", "veo-3-1"];
    case "custom":
      return [custom?.heroModel, custom?.brollModel].filter((x): x is string => Boolean(x));
    default:
      return [];
  }
}

/** Candidates for a tier (pool ∪ fallback), as the scorer wants them. */
export function tierCandidates(tier: AutoTier, extraIds: string[] = [], custom?: CustomSpec): ProviderCandidate[] {
  const ids = new Set([...tierCandidateIds(tier, custom), ...extraIds]);
  return [...ids]
    .map((id) => getVideoModel(id))
    .filter((m): m is VideoModel => Boolean(m))
    .map(toCandidate);
}

/** The whole catalog as candidates (for a "what would win" preview). */
export function allCandidates(): ProviderCandidate[] {
  return VIDEO_MODELS.map(toCandidate);
}
