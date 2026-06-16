import { getVideoModel } from "./video-models";

/** Full Auto-Generate quality tiers (smart mix; stock stays free). */
export type AutoTier = "economy" | "base" | "mid" | "platinum";

export type SectionJob = { model: string; targetSec: number; heroHold: boolean };

/** Whether a tier caps the *number* of AI-video beats (rest stay stills/stock).
    Economy reserves AI video for a few hero moments; the others tiers clip
    every non-stock beat but are still bounded by the per-video budget. */
export function tierCapsClipCount(tier: AutoTier): boolean {
  return tier === "economy";
}

/** Clip spec for a section given the tier + shot type + section length.
    Returns null for stock sections (kept as free Pexels footage). */
export function tierJobForSection(
  tier: AutoTier,
  shotType: string,
  scriptSec: number,
): SectionJob | null {
  if (shotType === "stock") return null;
  const sec = Math.max(4, Math.round(scriptSec));
  if (tier === "economy") {
    // Cheapest mix: short Seedance Fast clips for the few beats that get AI
    // video at all (the engine caps how many) — everything else stays a free
    // stock clip or a FLUX still with a Ken-Burns pan.
    return { model: "seedance-2-fast", targetSec: Math.min(sec, 8), heroHold: true };
  }
  if (tier === "base") {
    // Slow-pan (hold) instead of repetitive loops. Heroes capped at 8s — long
    // single takes cost more and time out far more often than they're worth.
    return shotType === "hero"
      ? { model: "seedance-2", targetSec: Math.min(sec, 8), heroHold: true }
      : { model: "seedance-2-fast", targetSec: Math.min(sec, 8), heroHold: true };
  }
  if (tier === "mid") {
    // Cheaper longer b-roll on Seedance Fast; keep Seedance 2.0 for the hero.
    return shotType === "hero"
      ? { model: "seedance-2", targetSec: Math.min(sec, 30), heroHold: false }
      : { model: "seedance-2-fast", targetSec: Math.min(sec, 30), heroHold: false };
  }
  // platinum: b-roll Seedance 2.0 to 60s; hero Veo 3.1 8s + slow-pan hold.
  return shotType === "hero"
    ? { model: "veo-3-1", targetSec: 8, heroHold: true }
    : { model: "seedance-2", targetSec: Math.min(sec, 60), heroHold: false };
}

export const AUTO_TIERS: { id: AutoTier; label: string; blurb: string }[] = [
  { id: "economy", label: "Economy", blurb: "Mostly free stock + still pans; AI video only on a few hero beats — lowest cost" },
  { id: "base", label: "Base", blurb: "Fast b-roll + Seedance 2.0 hero, slow-pan (no loops)" },
  { id: "mid", label: "Mid", blurb: "Seedance Fast b-roll to 30s + Seedance 2.0 hero — longer, cheaper" },
  { id: "platinum", label: "Platinum", blurb: "Seedance 2.0 b-roll to 60s + Veo 3.1 hero (slow-pan)" },
];

export type SelectedClip = { idx: number; shotType: string; job: SectionJob; costUsd: number };

/** Decide which beats actually get an AI-video clip, honouring the AI-clip
    count cap (economy) and the hard per-video budget. Hero beats are picked
    first; beats that don't make the cut keep their free still / stock visual.
    This is the single source of truth for both the cost estimate and the
    enqueue, so the displayed price always matches what gets billed. */
export function selectClipBeats(
  tier: AutoTier,
  beats: { idx: number; shotType: string; scriptSec: number }[],
  opts?: { clipCap?: number; maxUsd?: number },
): { clips: SelectedClip[]; totalUsd: number } {
  const clipCap = tierCapsClipCount(tier)
    ? (opts?.clipCap ?? 3)
    : Number.POSITIVE_INFINITY;
  const maxUsd = opts?.maxUsd ?? Number.POSITIVE_INFINITY;
  const candidates = beats
    .map((b) => ({ b, job: tierJobForSection(tier, b.shotType, b.scriptSec) }))
    .filter((c): c is { b: (typeof beats)[number]; job: SectionJob } => c.job !== null)
    .map((c) => {
      const m = getVideoModel(c.job.model);
      return { ...c, costUsd: (m?.usdPerSec ?? 0.05) * c.job.targetSec };
    })
    // Hero beats first so the budget buys impact, not filler.
    .sort((a, z) => Number(z.b.shotType === "hero") - Number(a.b.shotType === "hero"));

  const clips: SelectedClip[] = [];
  let totalUsd = 0;
  for (const c of candidates) {
    if (clips.length >= clipCap) break;
    if (totalUsd + c.costUsd > maxUsd) continue; // keep filling with cheaper beats
    clips.push({ idx: c.b.idx, shotType: c.b.shotType, job: c.job, costUsd: c.costUsd });
    totalUsd += c.costUsd;
  }
  return { clips, totalUsd: Math.round(totalUsd * 100) / 100 };
}

/** Estimate the full-video clip cost for a tier from the section breakdown. */
export function estimateTierCost(
  tier: AutoTier,
  beats: { shotType: string; scriptSec: number }[],
  opts?: { clipCap?: number; maxUsd?: number },
): number {
  return selectClipBeats(
    tier,
    beats.map((b, idx) => ({ idx, shotType: b.shotType, scriptSec: b.scriptSec })),
    opts,
  ).totalUsd;
}
