/**
 * Scored provider/model selection (OpenMontage Remixed #1).
 *
 * The medium router (shot-router.ts) decides WHAT medium a beat needs (still /
 * i2v / t2v / …). When that medium is generative video, MULTIPLE fal models can
 * satisfy it (Seedance 2.0 / Fast, Kling, Veo, LTX, Wan). This module is the
 * pure, deterministic selector that scores each candidate on SEVEN dimensions
 * and returns the winner + the ranked alternatives + a logged rationale — so a
 * per-beat model choice stops being a hardcoded tier constant and becomes an
 * explainable decision.
 *
 * Pure — no I/O, no catalog import — so it is fully unit-testable and stays
 * decoupled from the app's VIDEO_MODELS registry (the caller maps its catalog
 * into `ProviderCandidate`s and folds in live provider health). Same ethos as
 * routeMedium: it never fails — worst case it returns the cheapest option.
 */

/** The seven scoring dimensions (OpenMontage's provider rubric). */
export const SCORE_DIMENSIONS = [
  "taskFit", // does this model suit THIS beat (shot role, duration, audio need)?
  "quality", // intrinsic output quality tier
  "control", // creative control / determinism (i2v seed, discrete durations, audio)
  "reliability", // how dependable (base prior × live provider health)
  "cost", // cheaper is better, relative to the field and the budget
  "latency", // faster to generate is better
  "continuity", // look-consistency with the rest of the video (family, long-shot)
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

/** A model the caller offers to the selector, normalised from its catalog. All
    prior fields are 0..1 (the caller maps quality tiers / latency / reliability
    into this range) so the core stays catalog-agnostic. */
export type ProviderCandidate = {
  id: string;
  label: string;
  /** Provider family for continuity (e.g. "seedance" | "kling" | "veo"). */
  family: string;
  /** Intrinsic quality prior (0..1): draft≈0.4, standard≈0.7, premium≈1. */
  quality: number;
  /** Intrinsic control prior (0..1): i2v seed + discrete durations + audio toggle. */
  control: number;
  /** Base reliability prior (0..1) before live health is folded in. */
  reliability: number;
  /** Latency prior (0..1): 1 = fastest ("fast" variants), premium/long = lower. */
  speed: number;
  usdPerSec: number;
  audio: boolean;
  minDurationSec: number;
  maxDurationSec: number;
  /** Can produce a single long shot (extend/stitch) — a continuity edge. */
  longClip?: boolean;
};

export type ProviderScoreContext = {
  /** The beat's role — heroes weight quality/continuity, b-roll weights cost/speed. */
  shot: "hero" | "broll";
  /** Target clip length (drives duration-fit + cost). */
  targetSec: number;
  /** The beat genuinely wants native/synced audio (e.g. a dialogue hero). */
  needsAudio?: boolean;
  /** USD still available in the video's visual budget. */
  budgetRemainingUsd: number;
  /** Family used by earlier beats in this video — staying in-family reads more
      consistent (continuity). Undefined on the first scored beat. */
  preferredFamily?: string;
  /** Live health multiplier per family OR per model id (0..1). A flagged-down
      provider passes 0 here and is effectively benched. */
  health?: Record<string, number>;
  /** Optional weight overrides (per dimension). Missing dims use the default. */
  weights?: Partial<Record<ScoreDimension, number>>;
};

export type ScoredProvider = {
  id: string;
  label: string;
  family: string;
  /** Weighted total, 0..1. */
  total: number;
  /** Per-dimension score, 0..1. */
  dims: Record<ScoreDimension, number>;
  estCostUsd: number;
  affordable: boolean;
  /** One-line why-this-model note. */
  reason: string;
};

export type ProviderDecision = {
  winner: ScoredProvider;
  /** Ranked, best-first, excluding the winner. */
  alternatives: ScoredProvider[];
  /** Why the winner beat the field (for the decision log / audit trail). */
  rationale: string;
  /** The effective weights used (after shot profile + overrides). */
  weights: Record<ScoreDimension, number>;
};

/** Base dimension weights; the shot role tilts them (see profileWeights). */
const BASE_WEIGHTS: Record<ScoreDimension, number> = {
  taskFit: 0.22,
  quality: 0.16,
  control: 0.1,
  reliability: 0.14,
  cost: 0.16,
  latency: 0.1,
  continuity: 0.12,
};

/** Hero beats buy impact (quality/continuity/reliability up, cost/latency down);
    b-roll fills space cheaply (cost/latency/taskFit up, quality down). */
function profileWeights(
  shot: "hero" | "broll",
  overrides?: Partial<Record<ScoreDimension, number>>,
): Record<ScoreDimension, number> {
  const w = { ...BASE_WEIGHTS };
  if (shot === "hero") {
    w.quality += 0.08;
    w.continuity += 0.04;
    w.reliability += 0.02;
    w.cost -= 0.1;
    w.latency -= 0.04;
  } else {
    w.cost += 0.08;
    w.latency += 0.04;
    w.taskFit += 0.02;
    w.quality -= 0.1;
    w.continuity -= 0.04;
  }
  Object.assign(w, overrides ?? {});
  // Normalise to sum 1 so `total` stays a clean 0..1 regardless of overrides.
  const sum = SCORE_DIMENSIONS.reduce((s, d) => s + Math.max(0, w[d]), 0) || 1;
  for (const d of SCORE_DIMENSIONS) w[d] = Math.max(0, w[d]) / sum;
  return w;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** How well a candidate's duration range covers the target (1 = clean fit). */
function durationFit(c: ProviderCandidate, targetSec: number): number {
  if (targetSec >= c.minDurationSec && targetSec <= c.maxDurationSec) return 1;
  if (targetSec > c.maxDurationSec) {
    // Reachable by stitch/extend, but with a seam penalty unless it's a longClip.
    return c.longClip ? 0.85 : 0.55;
  }
  // Below the model's floor — it will over-generate; mild penalty.
  return 0.7;
}

function estCost(c: ProviderCandidate, targetSec: number): number {
  const dur = Math.max(c.minDurationSec, Math.min(targetSec, c.maxDurationSec));
  return Math.round(c.usdPerSec * dur * 1000) / 1000;
}

function healthFor(c: ProviderCandidate, health?: Record<string, number>): number {
  if (!health) return 1;
  const byId = health[c.id];
  const byFamily = health[c.family];
  return clamp01(byId ?? byFamily ?? 1);
}

/**
 * Score every candidate and return the winner + ranked alternatives + a
 * rationale. Never throws and never returns empty when given candidates: if
 * nothing is affordable it still returns the cheapest, flagged not-affordable
 * (the caller can then downshift the medium, mirroring routeMedium).
 */
export function scoreProviders(
  candidates: ProviderCandidate[],
  ctx: ProviderScoreContext,
): ProviderDecision | null {
  if (candidates.length === 0) return null;
  const weights = profileWeights(ctx.shot, ctx.weights);
  const budget = ctx.budgetRemainingUsd;

  // Cost is scored relative to the field (cheapest in the set = 1).
  const costs = candidates.map((c) => estCost(c, ctx.targetSec));
  const maxCost = Math.max(...costs, 0.0001);

  const scored: ScoredProvider[] = candidates.map((c, i) => {
    const cost = costs[i];
    const fit = durationFit(c, ctx.targetSec);
    const audioMatch = ctx.needsAudio ? (c.audio ? 1 : 0.15) : 1;
    // Hero role rewards higher-quality models on task-fit; b-roll rewards
    // "enough" quality delivered cheaply/fast.
    const roleFit =
      ctx.shot === "hero"
        ? 0.5 + 0.5 * c.quality
        : 0.6 + 0.4 * (1 - Math.abs(c.quality - 0.6)); // b-roll ideal ≈ standard
    const taskFit = clamp01(fit * audioMatch * roleFit);

    const reliability = clamp01(c.reliability * healthFor(c, ctx.health));
    const cost01 = clamp01(1 - cost / maxCost);
    const continuity = clamp01(
      (ctx.preferredFamily
        ? c.family === ctx.preferredFamily
          ? 1
          : 0.45
        : 0.75) +
        (c.longClip && ctx.targetSec > c.maxDurationSec ? 0.15 : 0),
    );

    const dims: Record<ScoreDimension, number> = {
      taskFit,
      quality: clamp01(c.quality),
      control: clamp01(c.control),
      reliability,
      cost: cost01,
      latency: clamp01(c.speed),
      continuity,
    };
    const total = SCORE_DIMENSIONS.reduce((s, d) => s + dims[d] * weights[d], 0);
    return {
      id: c.id,
      label: c.label,
      family: c.family,
      total: Math.round(total * 1000) / 1000,
      dims,
      estCostUsd: cost,
      affordable: cost <= budget + 1e-9,
      reason: candidateReason(c, dims, ctx),
    };
  });

  const ranked = [...scored].sort((a, b) => b.total - a.total);

  // Prefer the best AFFORDABLE model; only if none fits the budget do we fall
  // back to the cheapest (never fail — the caller can downshift the medium).
  const affordable = ranked.filter((s) => s.affordable);
  const winner =
    affordable[0] ??
    [...ranked].sort((a, b) => a.estCostUsd - b.estCostUsd)[0];
  const alternatives = ranked.filter((s) => s.id !== winner.id);

  return {
    winner,
    alternatives,
    rationale: decisionRationale(winner, alternatives[0], weights, ctx),
    weights,
  };
}

/** The dimension a candidate scored highest on, for its one-line note. */
function topDimension(dims: Record<ScoreDimension, number>): ScoreDimension {
  return SCORE_DIMENSIONS.reduce((best, d) => (dims[d] > dims[best] ? d : best), SCORE_DIMENSIONS[0]);
}

const DIM_PHRASE: Record<ScoreDimension, string> = {
  taskFit: "best fit for the beat",
  quality: "top visual quality",
  control: "most creative control",
  reliability: "most reliable",
  cost: "cheapest",
  latency: "fastest",
  continuity: "keeps the look consistent",
};

function candidateReason(
  c: ProviderCandidate,
  dims: Record<ScoreDimension, number>,
  ctx: ProviderScoreContext,
): string {
  const bits: string[] = [DIM_PHRASE[topDimension(dims)]];
  if (ctx.needsAudio && c.audio) bits.push("native audio");
  if (ctx.preferredFamily && c.family === ctx.preferredFamily) bits.push("in-family");
  return `$${estCost(c, ctx.targetSec).toFixed(2)} · ${bits.join(", ")}`;
}

function decisionRationale(
  winner: ScoredProvider,
  runnerUp: ScoredProvider | undefined,
  weights: Record<ScoreDimension, number>,
  ctx: ProviderScoreContext,
): string {
  const lead = topDimension(winner.dims);
  const role = ctx.shot === "hero" ? "hero" : "b-roll";
  let s = `${winner.label} wins the ${role} beat on ${DIM_PHRASE[lead]} (score ${winner.total.toFixed(2)}, ~$${winner.estCostUsd.toFixed(2)}).`;
  if (runnerUp) {
    s += ` Over ${runnerUp.label} (${runnerUp.total.toFixed(2)})`;
    // Name the dimension where the winner most out-scored the runner-up.
    const gap = SCORE_DIMENSIONS.map((d) => ({
      d,
      delta: (winner.dims[d] - runnerUp.dims[d]) * weights[d],
    })).sort((a, b) => b.delta - a.delta)[0];
    if (gap.delta > 0) s += ` on ${DIM_PHRASE[gap.d]}`;
    s += ".";
  }
  if (!winner.affordable) s += " (over budget — downshift recommended)";
  return s;
}
