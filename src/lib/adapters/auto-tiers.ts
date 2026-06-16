import { getVideoModel } from "./video-models";

/** Full Auto-Generate quality tiers (smart mix; stock stays free). */
export type AutoTier = "base" | "mid" | "platinum";

export type SectionJob = { model: string; targetSec: number; heroHold: boolean };

/** Clip spec for a section given the tier + shot type + section length.
    Returns null for stock sections (kept as free Pexels footage). */
export function tierJobForSection(
  tier: AutoTier,
  shotType: string,
  scriptSec: number,
): SectionJob | null {
  if (shotType === "stock") return null;
  const sec = Math.max(4, Math.round(scriptSec));
  if (tier === "base") {
    return shotType === "hero"
      ? { model: "seedance-2", targetSec: Math.min(sec, 15), heroHold: false }
      : { model: "seedance-2-fast", targetSec: Math.min(sec, 8), heroHold: false };
  }
  if (tier === "mid") {
    // Seedance 2.0 stitched to 30s for both b-roll and hero.
    return { model: "seedance-2", targetSec: Math.min(sec, 30), heroHold: false };
  }
  // platinum: b-roll Seedance 2.0 to 60s; hero Veo 3.1 8s + slow-pan hold.
  return shotType === "hero"
    ? { model: "veo-3-1", targetSec: 8, heroHold: true }
    : { model: "seedance-2", targetSec: Math.min(sec, 60), heroHold: false };
}

export const AUTO_TIERS: { id: AutoTier; label: string; blurb: string }[] = [
  { id: "base", label: "Base", blurb: "Fast b-roll + Seedance 2.0 hero — cheapest, rapid" },
  { id: "mid", label: "Mid", blurb: "Seedance 2.0 stitched to 30s — longer, more engaging" },
  { id: "platinum", label: "Platinum", blurb: "Seedance 2.0 b-roll to 60s + Veo 3.1 hero (slow-pan)" },
];

/** Estimate the full-video cost for a tier from the section breakdown. */
export function estimateTierCost(
  tier: AutoTier,
  beats: { shotType: string; scriptSec: number }[],
): number {
  let total = 0;
  for (const b of beats) {
    const job = tierJobForSection(tier, b.shotType, b.scriptSec);
    if (!job) continue;
    const m = getVideoModel(job.model);
    if (m) total += m.usdPerSec * job.targetSec;
  }
  return Math.round(total * 100) / 100;
}
