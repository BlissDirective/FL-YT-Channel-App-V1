import type { CustomSpec } from "@/lib/db/types";
import { clampDuration, getVideoModel } from "./video-models";

/** Full Auto-Generate quality tiers (smart mix; stock stays free).
    base → economy → premium → platinum climb the AI-video spend; custom is
    operator-driven (per-video models + a price cap). Accent counts scale with
    narration length, so a tier works for short- and long-form alike.
    director (MVDA Phase E) = Platinum visuals + the agent authors the cut:
    identical clip plan, plus the video routes to an agent session instead of
    automatic assembly when clips finish. */
export type AutoTier = "base" | "economy" | "premium" | "platinum" | "director" | "custom";

export type SectionJob = { model: string; targetSec: number; heroHold: boolean };

// ── Length-aware pacing ───────────────────────────────────────────────
/** One b-roll accent per ~60s of narration fills the space between heroes. */
const ACCENT_PER_SEC = 60;
/** Shorts are pure attention plays — animate densely (≈1 accent per 12s) so a
    30–180s native Short is motion the whole way through, not mostly stills. */
const ACCENT_PER_SEC_SHORT = 12;
/** Premium & Platinum bookend with two heroes once there are this many
    eligible (non-stock) beats; below it they collapse to a single hero. */
const HERO_BOOKEND_MIN_BEATS = 3;
/** Above ~6 min, Platinum b-roll drops Seedance 2.0 → Seedance Fast so a long
    video stays affordable (per the long-form cost rule). */
const PLATINUM_CHEAP_BROLL_OVER_SEC = 360;
/** Economy never places more than this many accents (rest stay stills/stock). */
const ECONOMY_MAX_ACCENTS = 3;

/** Clamp a requested length to [lo, hi]. The model's own duration snapping
    happens at generation time; this keeps the cost estimate honest. */
function clampSec(sec: number, lo: number, hi: number): number {
  return Math.min(Math.max(sec, lo), hi);
}

/** Two heroes (start + end) once a video has enough beats, else one, else none. */
function heroBookendCount(eligibleBeats: number): 0 | 1 | 2 {
  if (eligibleBeats <= 0) return 0;
  return eligibleBeats >= HERO_BOOKEND_MIN_BEATS ? 2 : 1;
}

/** Tiers that force hero accents at the start and end of the video. */
function tierBookends(tier: AutoTier): boolean {
  return tier === "premium" || tier === "platinum" || tier === "director" || tier === "custom";
}

/** Pick n items spread evenly across an array (preserves order, no dupes). */
function spreadPick<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  if (n >= arr.length) return [...arr];
  if (n === 1) return [arr[Math.floor((arr.length - 1) / 2)]];
  const seen = new Set<number>();
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (arr.length - 1)) / (n - 1));
    if (!seen.has(idx)) {
      seen.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

/** Clip spec for one section given the tier, the (effective) shot type, the
    section length, and the whole-video length. Returns null for stock/base
    sections (kept as a free still/stock clip + Ken-Burns pan). */
export function tierJobForSection(
  tier: AutoTier,
  shotType: string,
  scriptSec: number,
  totalSec = 0,
  custom?: CustomSpec,
): SectionJob | null {
  if (shotType === "stock") return null;
  const sec = Math.max(4, Math.round(scriptSec));
  const hero = shotType === "hero";
  switch (tier) {
    case "base":
      // Free equivalent: no AI video; every beat stays a still/stock + pan.
      return null;
    case "economy":
      // Cheapest motion: short Seedance Fast accents (count-capped).
      return { model: "seedance-2-fast", targetSec: Math.min(sec, 8), heroHold: true };
    case "premium":
      return hero
        ? { model: "seedance-2", targetSec: clampSec(sec, 8, 15), heroHold: true }
        : { model: "seedance-2-fast", targetSec: clampSec(sec, 5, 10), heroHold: false };
    case "platinum":
    case "director": {
      // Director rides Platinum's exact visual plan — the tier's delta is the
      // agent cut session, which happens after clips land (engine/clip-queue).
      if (hero) return { model: "kling-2-5-turbo", targetSec: 10, heroHold: true };
      // Long-form (>6 min): cheaper Seedance Fast b-roll to stay under budget.
      const cheap = totalSec > PLATINUM_CHEAP_BROLL_OVER_SEC;
      return cheap
        ? { model: "seedance-2-fast", targetSec: clampSec(sec, 5, 10), heroHold: false }
        : { model: "seedance-2", targetSec: clampSec(sec, 8, 15), heroHold: false };
    }
    case "custom": {
      if (!custom) return null;
      const modelId = hero ? custom.heroModel : custom.brollModel;
      const model = getVideoModel(modelId);
      if (!model) return null;
      const want = hero ? custom.heroSec : custom.brollSec;
      return { model: modelId, targetSec: clampDuration(model, want), heroHold: hero };
    }
  }
}

/** Rough per-video clip-cost estimate (USD) by format + tier, for calendar
    budget allocation BEFORE scripts exist. Planning only — actual spend is
    enforced at generation time by the per-video / portfolio caps. */
export const TIER_PLAN_COST: Record<"short" | "long", Record<AutoTier, number>> = {
  short: { base: 0, economy: 0.3, premium: 1.2, platinum: 2.5, director: 3.3, custom: 1.5 },
  long: { base: 0, economy: 1.0, premium: 3.5, platinum: 7.0, director: 7.8, custom: 4.0 },
};

export function planCostFor(format: "short" | "long", tier: AutoTier): number {
  return TIER_PLAN_COST[format]?.[tier] ?? 0;
}

export const AUTO_TIERS: { id: AutoTier; label: string; blurb: string }[] = [
  { id: "base", label: "Base", blurb: "Free equivalent — stills + Pexels stock + Ken Burns, no AI video" },
  { id: "economy", label: "Economy", blurb: "A few Seedance Fast accents (≤3); rest stays stills/stock" },
  { id: "premium", label: "Premium", blurb: "Hero bookends (Seedance 2.0) + Seedance Fast b-roll, ~1/min" },
  { id: "platinum", label: "Platinum", blurb: "Kling hero bookends + Seedance 2.0 b-roll (Fast over 6 min)" },
  { id: "director", label: "Director", blurb: "Platinum visuals + the MVDA agent authors the cut (~$0.80/session)" },
  { id: "custom", label: "Custom", blurb: "Pick your own hero & b-roll models, lengths, and price cap" },
];

export type SelectedClip = { idx: number; shotType: string; job: SectionJob; costUsd: number };
export type ClipSelection = {
  clips: SelectedClip[];
  /** Cost of the beats that fit the budget (what gets billed). */
  totalUsd: number;
  /** Cost of the full plan before any budget trimming. */
  requestedUsd: number;
  /** True when the full plan exceeds maxUsd (Custom pauses; others trim). */
  overBudget: boolean;
};

const costOf = (job: SectionJob): number => {
  const m = getVideoModel(job.model);
  if (!m) return 0.05 * job.targetSec;
  return m.usdPerSec * clampDuration(m, job.targetSec);
};

/** Plan which beats get an AI-video accent and at what cost.

    Heroes bookend the video (start + end) on the bookend tiers; b-roll fills
    the middle at ~1 accent per 60s, spread evenly. The plan is then packed
    under the per-video budget (heroes first, so the budget buys impact);
    beats that don't fit keep their free still/stock. This is the single source
    of truth for both the displayed estimate and the enqueue.

      • opts.clipCap   — hard accent ceiling (economy passes ai_clip_cap).
      • opts.maxUsd    — per-video budget (Custom passes its price cap).
      • opts.custom    — Custom recipe (models + lengths). */
export function selectClipBeats(
  tier: AutoTier,
  beats: { idx: number; shotType: string; scriptSec: number }[],
  opts?: { clipCap?: number; maxUsd?: number; custom?: CustomSpec; shortMode?: boolean },
): ClipSelection {
  const empty: ClipSelection = { clips: [], totalUsd: 0, requestedUsd: 0, overBudget: false };
  if (tier === "base" || beats.length === 0) return empty;

  const accentPerSec = opts?.shortMode ? ACCENT_PER_SEC_SHORT : ACCENT_PER_SEC;
  const totalSec = beats.reduce((s, b) => s + b.scriptSec, 0);
  const ordered = [...beats].sort((a, z) => a.idx - z.idx);
  const eligible = ordered.filter((b) => b.shotType !== "stock");
  if (eligible.length === 0) return empty;

  // 1) Decide hero beats (positional bookends) and the b-roll fill set.
  const heroIdx = new Set<number>();
  let brollPool = eligible;
  if (tierBookends(tier)) {
    const hc = heroBookendCount(eligible.length);
    if (hc >= 1) heroIdx.add(eligible[0].idx);
    if (hc === 2) heroIdx.add(eligible[eligible.length - 1].idx);
    brollPool = eligible.filter((b) => !heroIdx.has(b.idx));
  }

  // 2) Target b-roll count from length (economy is capped instead).
  let brollTarget: number;
  if (tier === "economy") {
    const cap = Math.min(opts?.clipCap ?? ECONOMY_MAX_ACCENTS, ECONOMY_MAX_ACCENTS);
    brollTarget = Math.min(cap, Math.max(1, Math.round(totalSec / accentPerSec)));
  } else {
    brollTarget = Math.round(totalSec / accentPerSec);
    if (opts?.clipCap !== undefined) brollTarget = Math.min(brollTarget, opts.clipCap);
  }
  const brollBeats = spreadPick(brollPool, brollTarget);

  // 3) Build the full plan: heroes first (priority), then evenly-spread b-roll.
  type Cand = { idx: number; shotType: string; job: SectionJob; costUsd: number };
  const build = (b: (typeof eligible)[number], shot: string): Cand | null => {
    const job = tierJobForSection(tier, shot, b.scriptSec, totalSec, opts?.custom);
    return job ? { idx: b.idx, shotType: shot, job, costUsd: costOf(job) } : null;
  };
  const heroCands = eligible.filter((b) => heroIdx.has(b.idx)).map((b) => build(b, "hero"));
  const brollCands = brollBeats.map((b) => build(b, "broll"));
  const plan = [...heroCands, ...brollCands].filter((c): c is Cand => c !== null);

  const requestedUsd = plan.reduce((s, c) => s + c.costUsd, 0);
  const maxUsd = opts?.maxUsd ?? Number.POSITIVE_INFINITY;

  // 4) Pack under budget (heroes already first); overflow stays stills/stock.
  const clips: SelectedClip[] = [];
  let totalUsd = 0;
  for (const c of plan) {
    if (totalUsd + c.costUsd > maxUsd) continue;
    clips.push({ idx: c.idx, shotType: c.shotType, job: c.job, costUsd: c.costUsd });
    totalUsd += c.costUsd;
  }
  return {
    clips,
    totalUsd: Math.round(totalUsd * 100) / 100,
    requestedUsd: Math.round(requestedUsd * 100) / 100,
    overBudget: requestedUsd > maxUsd + 1e-9,
  };
}

/** Estimate the full-video clip cost for a tier from the section breakdown.
    Returns the budget-packed total (what would actually bill). */
export function estimateTierCost(
  tier: AutoTier,
  beats: { shotType: string; scriptSec: number }[],
  opts?: { clipCap?: number; maxUsd?: number; custom?: CustomSpec; shortMode?: boolean },
): number {
  return selectClipBeats(
    tier,
    beats.map((b, idx) => ({ idx, shotType: b.shotType, scriptSec: b.scriptSec })),
    opts,
  ).totalUsd;
}
