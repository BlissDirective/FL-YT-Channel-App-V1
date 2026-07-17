/**
 * Visual Craft Engine V2 — shot decomposition + the Medium Router.
 *
 * A pure, deterministic mapping from a shot's INTENT to the cheapest MEDIUM that
 * satisfies it, respecting the remaining budget. This is the biggest cost +
 * relevance lever: explanatory shots become near-free motion graphics/charts,
 * and premium generative video is reserved for the 1–3 hero beats that earn it.
 *
 * Pure — no I/O — so the whole routing decision is unit-testable (the truth
 * table + budget downshift are the crux of V2's acceptance).
 */

export type ShotIntent =
  | "establish" // wide/context shot
  | "detail" // close, specific subject
  | "motion" // needs real movement
  | "data" // a statistic / chart
  | "concept" // an idea/comparison/number/process
  | "quote" // a spoken line to feature
  | "hero"; // the marquee cinematic beat

export type Medium =
  | "remotion" // programmatic motion graphic (≈ free)
  | "chart" // verified data-viz (≈ free)
  | "stick" // programmatic stick-figure scene (≈ free)
  | "stock" // licensed stock (≈ free)
  | "free_footage" // CLIP-retrieved Archive.org/Wikimedia/Pexels motion (≈ free, #14)
  | "still" // FLUX text→image + Ken Burns
  | "i2v" // image→video (Seedance/Kling/Veo) from a still seed
  | "t2v"; // text→video direct

/** Indicative per-shot cost the router budgets against (USD). Deliberately a
    little conservative so a plan never under-estimates spend. */
export const MEDIUM_COST: Record<Medium, number> = {
  remotion: 0,
  chart: 0,
  stick: 0,
  stock: 0,
  free_footage: 0,
  still: 0.025,
  t2v: 0.15,
  i2v: 0.2,
};
/** Premium i2v (Kling/Veo hero) costs more than a standard i2v accent. */
export const HERO_I2V_COST = 0.5;

export type ShotInput = {
  beatIdx: number;
  intent: ShotIntent;
  /** The beat wants real photoreal motion (planner hint). */
  wantsMotion?: boolean;
  /** Marked the marquee beat — eligible for premium cinematic spend. */
  hero?: boolean;
  durationSec?: number;
};

export type RouteContext = {
  /** USD still available in the video's visual budget. */
  budgetRemainingUsd: number;
  /** Programmatic stick render available for this channel. */
  stickAllowed?: boolean;
  /** Verified data-viz available for this channel/niche. */
  dataVizAllowed?: boolean;
  /** Free CLIP-retrieved documentary footage available (#14). When set, real
      motion for establish/motion beats comes free before any paid i2v. */
  freeFootageAllowed?: boolean;
};

export type Shot = {
  id: string;
  beatIdx: number;
  intent: ShotIntent;
  medium: Medium;
  durationSec: number;
  estCostUsd: number;
  reason: string;
};

/** The execution shotType the existing generator understands. Richer mediums
    (remotion/chart/stick) render via the compositor (V5); until then they map
    to the closest executable path so the plan is never a dead end. */
export function mediumToShotType(medium: Medium): "hero" | "broll" | "stock" {
  switch (medium) {
    case "i2v":
    case "t2v":
      return "hero";
    case "still":
      return "broll";
    case "stock":
    case "free_footage":
    case "chart":
    case "remotion":
    case "stick":
      return "stock";
  }
}

/**
 * Choose the cheapest medium that satisfies a shot's intent, within budget.
 * Deterministic. The ladder: free (remotion/chart/stick/stock) → still → i2v →
 * hero-i2v. When the budget can't afford the ideal medium, it downshifts to the
 * cheapest medium that still communicates the beat (never fails — worst case a
 * still or stock).
 */
export function routeMedium(shot: ShotInput, ctx: RouteContext): Shot {
  const dur = Math.max(2, Math.round(shot.durationSec ?? 4));
  const budget = ctx.budgetRemainingUsd;
  const mk = (medium: Medium, reason: string, hero = false): Shot => {
    const est = hero ? HERO_I2V_COST : MEDIUM_COST[medium];
    return { id: `${shot.beatIdx}-${medium}`, beatIdx: shot.beatIdx, intent: shot.intent, medium, durationSec: dur, estCostUsd: est, reason };
  };
  const affordable = (m: Medium, hero = false) => (hero ? HERO_I2V_COST : MEDIUM_COST[m]) <= budget;

  // Free-medium intents never spend.
  if (shot.intent === "data" && ctx.dataVizAllowed) return mk("chart", "data → verified chart (free)");
  if (shot.intent === "quote") return mk("remotion", "quote → motion-graphic card (free)");
  if (shot.intent === "concept") {
    return ctx.stickAllowed ? mk("stick", "concept → programmatic scene (free)") : mk("remotion", "concept → motion graphic (free)");
  }
  if (shot.intent === "establish" && !shot.wantsMotion) {
    if (ctx.freeFootageAllowed) return mk("free_footage", "establish → free documentary footage (CLIP)");
    return affordable("still") ? mk("still", "establish → still + Ken Burns") : mk("stock", "establish → stock (budget)");
  }

  // Real motion for a non-hero motion beat comes FREE from the corpus first,
  // before spending on i2v (#14) — a big cost + grounding win.
  if (ctx.freeFootageAllowed && (shot.intent === "motion" || shot.wantsMotion) && !shot.hero && shot.intent !== "hero") {
    return mk("free_footage", "motion → free documentary footage (CLIP)");
  }

  // Hero / cinematic: premium i2v when affordable, else step down the ladder.
  if (shot.hero || shot.intent === "hero") {
    if (affordable("i2v", true)) return mk("i2v", "hero → cinematic i2v (premium)", true);
    if (affordable("i2v")) return mk("i2v", "hero → standard i2v (budget-capped)");
    if (affordable("still")) return mk("still", "hero → still + Ken Burns (budget)");
    return mk("stock", "hero → stock (budget exhausted)");
  }

  // Motion / detail: real motion if affordable, else a strong still, else stock.
  if (shot.intent === "motion" || shot.wantsMotion) {
    if (affordable("i2v")) return mk("i2v", "motion → i2v");
    if (affordable("t2v")) return mk("t2v", "motion → t2v (budget)");
    if (affordable("still")) return mk("still", "motion → still (budget)");
    return mk("stock", "motion → stock (budget)");
  }

  // Detail / default.
  return affordable("still") ? mk("still", "detail → still") : mk("stock", "detail → stock (budget)");
}

export type ShotPlan = {
  beats: { beatIdx: number; shots: Shot[] }[];
  version: number;
  planCostUsd: number;
};

/** Total estimated spend of a plan (pure). */
export function planCost(plan: Pick<ShotPlan, "beats">): number {
  return Math.round(
    plan.beats.reduce((s, b) => s + b.shots.reduce((ss, sh) => ss + sh.estCostUsd, 0), 0) * 100,
  ) / 100;
}
