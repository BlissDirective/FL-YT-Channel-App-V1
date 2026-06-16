import { getVideoModel } from "./video-models";

/** Full Auto-Generate quality tiers (smart mix; stock stays free).
    base → economy → premium → platinum climb the AI-video spend; custom is
    fully operator-driven (per-beat models + a price cap) and is configured
    through its own panel rather than this static matrix. */
export type AutoTier = "base" | "economy" | "premium" | "platinum" | "custom";

export type SectionJob = { model: string; targetSec: number; heroHold: boolean };

/** Clamp a requested length to [lo, hi]. The model's own duration snapping
    happens at generation time; this just keeps the cost estimate honest. */
function clampSec(sec: number, lo: number, hi: number): number {
  return Math.min(Math.max(sec, lo), hi);
}

/** Max number of AI-video accents a tier will place (rest stay stills/stock).
    custom is unbounded here — its panel enforces a per-video price cap. */
export function tierClipCap(tier: AutoTier): number {
  switch (tier) {
    case "base":
      return 0;
    case "economy":
      return 3;
    case "premium":
      return 6;
    case "platinum":
      return 8;
    case "custom":
      return Number.POSITIVE_INFINITY;
  }
}

/** Clip spec for a section given the tier + shot type + section length.
    Returns null for stock sections (kept as free Pexels footage) and for the
    base tier (no AI video at all — stills + stock + Ken-Burns only). */
export function tierJobForSection(
  tier: AutoTier,
  shotType: string,
  scriptSec: number,
): SectionJob | null {
  if (shotType === "stock") return null;
  const sec = Math.max(4, Math.round(scriptSec));
  switch (tier) {
    case "base":
      // Free equivalent: no AI video; every beat stays a still/stock + pan.
      return null;
    case "economy":
      // Cheapest motion: a few short Seedance Fast accents (count-capped);
      // everything else stays a free stock clip or a still with a Ken-Burns pan.
      return { model: "seedance-2-fast", targetSec: Math.min(sec, 8), heroHold: true };
    case "premium":
      // B-roll on cheap/fast Seedance; hero on standard Seedance 2.0.
      return shotType === "hero"
        ? { model: "seedance-2", targetSec: clampSec(sec, 8, 15), heroHold: true }
        : { model: "seedance-2-fast", targetSec: clampSec(sec, 5, 10), heroHold: false };
    case "platinum":
      // B-roll on Seedance 2.0; hero on Kling v2.5-turbo Pro (caps at 10s, so
      // an "8–15s" hero snaps to 8–10s — see clampDuration in video-models).
      return shotType === "hero"
        ? { model: "kling-2-5-turbo", targetSec: 10, heroHold: true }
        : { model: "seedance-2", targetSec: clampSec(sec, 8, 15), heroHold: false };
    case "custom":
      // The Custom panel supplies a per-beat model/duration; this fallback (a
      // premium-equivalent mix) only feeds the headline estimate before the
      // operator has configured anything.
      return shotType === "hero"
        ? { model: "seedance-2", targetSec: clampSec(sec, 8, 15), heroHold: true }
        : { model: "seedance-2-fast", targetSec: clampSec(sec, 5, 10), heroHold: false };
  }
}

export const AUTO_TIERS: { id: AutoTier; label: string; blurb: string }[] = [
  { id: "base", label: "Base", blurb: "Free equivalent — Pollinations stills + Pexels stock + Ken Burns, no AI video" },
  { id: "economy", label: "Economy", blurb: "2–3 Seedance Fast accents (8s); rest stays stills/stock — lowest motion cost" },
  { id: "premium", label: "Premium", blurb: "5–6 accents: Seedance Fast b-roll + Seedance 2.0 hero (8–15s)" },
  { id: "platinum", label: "Platinum", blurb: "6–8 accents: Seedance 2.0 b-roll + Kling v2.5-turbo Pro hero (8–10s)" },
];

export type SelectedClip = { idx: number; shotType: string; job: SectionJob; costUsd: number };

/** Decide which beats actually get an AI-video clip, honouring the tier's
    accent cap and the hard per-video budget. Hero beats are picked first;
    beats that don't make the cut keep their free still / stock visual. This is
    the single source of truth for both the cost estimate and the enqueue, so
    the displayed price always matches what gets billed.
      • opts.clipCap overrides the tier cap (economy passes the project's
        ai_clip_cap; Custom passes its operator-chosen count).
      • opts.maxUsd is the hard per-video budget. */
export function selectClipBeats(
  tier: AutoTier,
  beats: { idx: number; shotType: string; scriptSec: number }[],
  opts?: { clipCap?: number; maxUsd?: number },
): { clips: SelectedClip[]; totalUsd: number } {
  const clipCap = opts?.clipCap ?? tierClipCap(tier);
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
