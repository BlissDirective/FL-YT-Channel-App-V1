import "server-only";
import {
  scoreProviders,
  type ProviderDecision,
  type ProviderScoreContext,
} from "@studio/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { providerOutage } from "@/lib/pipeline/provider-health";
import type { AutoTier } from "./auto-tiers";
import type { CustomSpec } from "@/lib/db/types";
import { clampDuration, getVideoModel, type VideoModel } from "./video-models";
import {
  modelFamily,
  tierCandidateIds,
  toCandidate,
} from "./provider-candidates";

/**
 * Scored provider/model selection (OpenMontage Remixed #1) — server adapter.
 *
 * Uses the shared client-safe candidate mapping (provider-candidates.ts), folds
 * in LIVE provider health (the fal circuit-breaker + per-model recent error
 * rates), and picks the best model PER BEAT with a logged rationale +
 * alternatives. The tier's hardcoded pick stays the deterministic baseline
 * (auto-tiers.ts), but which concrete model actually runs — and why — is now an
 * explainable, budget- and reliability-aware decision instead of a constant.
 */

/** Compact per-beat decision persisted to clip_jobs.selection (and later copied
    to assets.meta.selection for regenerable-asset provenance — sets up #9/C2). */
export type SelectionLog = {
  model: string;
  rationale: string;
  score: number;
  estCostUsd: number;
  dims: ProviderDecision["winner"]["dims"];
  weights: ProviderDecision["weights"];
  alternatives: { id: string; label: string; total: number; estCostUsd: number }[];
  /** Set when the operator locked the model (Custom) — scoring is informational. */
  operatorLocked?: boolean;
};

export type ModelHealth = Record<string, number>;

/**
 * Live health map (0..1 per family/model) for the reliability dimension:
 *  • the fal circuit-breaker benches EVERY fal model when fal is flagged down;
 *  • recent `clip_jobs` error rates per model gently down-weight a flaky model.
 * Computed once per build (not per beat). Never throws — degrades to "healthy".
 */
export async function videoModelHealth(db: SupabaseClient): Promise<ModelHealth> {
  const health: ModelHealth = {};
  try {
    const outage = await providerOutage(db, "fal");
    if (outage.down) {
      // All these models route through fal — bench the lot until it recovers.
      for (const f of ["seedance", "kling", "veo", "ltx", "wan"]) health[f] = 0.05;
      return health;
    }
  } catch {
    /* breaker unavailable → treat as healthy */
  }
  try {
    // Per-model reliability from the last ~120 finished jobs (error rate → 0..1).
    const { data } = await db
      .from("clip_jobs")
      .select("model, status")
      .in("status", ["done", "error"])
      .order("created_at", { ascending: false })
      .limit(120);
    const agg = new Map<string, { total: number; err: number }>();
    for (const r of (data ?? []) as { model: string; status: string }[]) {
      const a = agg.get(r.model) ?? { total: 0, err: 0 };
      a.total += 1;
      if (r.status === "error") a.err += 1;
      agg.set(r.model, a);
    }
    for (const [model, a] of agg) {
      // Only trust the signal with a few samples; map error rate → 0.55..1.
      if (a.total >= 4) health[model] = Math.max(0.3, 1 - (a.err / a.total) * 0.9);
    }
  } catch {
    /* no history → healthy */
  }
  return health;
}

export type BeatModelChoice = {
  modelId: string;
  targetSec: number;
  family: string;
  selection: SelectionLog;
};

/**
 * Pick the model for one beat. `fallbackModel` is the tier's default (the
 * deterministic baseline) — if scoring somehow yields nothing it is used as-is.
 * `preferredFamily` carries the family earlier beats used (continuity).
 */
export function selectBeatModel(opts: {
  tier: AutoTier;
  shot: "hero" | "broll";
  targetSec: number;
  budgetRemainingUsd: number;
  fallbackModel: string;
  preferredFamily?: string;
  needsAudio?: boolean;
  custom?: CustomSpec;
  health?: ModelHealth;
}): BeatModelChoice {
  const poolIds = new Set(tierCandidateIds(opts.tier, opts.custom));
  poolIds.add(opts.fallbackModel); // the tier default always competes
  const candidates = [...poolIds]
    .map((id) => getVideoModel(id))
    .filter((m): m is VideoModel => Boolean(m))
    .map(toCandidate);

  const ctx: ProviderScoreContext = {
    shot: opts.shot,
    targetSec: opts.targetSec,
    needsAudio: opts.needsAudio,
    budgetRemainingUsd: opts.budgetRemainingUsd,
    preferredFamily: opts.preferredFamily,
    health: opts.health,
  };
  const decision = scoreProviders(candidates, ctx);

  // Custom tier (or any single-candidate pool): the operator locked the model.
  const operatorLocked = opts.tier === "custom";

  if (!decision) {
    const fb = getVideoModel(opts.fallbackModel);
    return {
      modelId: opts.fallbackModel,
      targetSec: fb ? clampDuration(fb, opts.targetSec) : opts.targetSec,
      family: modelFamily(opts.fallbackModel),
      selection: {
        model: opts.fallbackModel,
        rationale: "Tier default (no scored candidates).",
        score: 0,
        estCostUsd: 0,
        dims: {} as SelectionLog["dims"],
        weights: {} as SelectionLog["weights"],
        alternatives: [],
        operatorLocked,
      },
    };
  }

  const w = decision.winner;
  const winnerModel = getVideoModel(w.id)!;
  return {
    modelId: w.id,
    targetSec: clampDuration(winnerModel, opts.targetSec),
    family: w.family,
    selection: {
      model: w.id,
      rationale: operatorLocked ? `Operator-selected (Custom tier). ${decision.rationale}` : decision.rationale,
      score: w.total,
      estCostUsd: w.estCostUsd,
      dims: w.dims,
      weights: decision.weights,
      alternatives: decision.alternatives
        .slice(0, 3)
        .map((a) => ({ id: a.id, label: a.label, total: a.total, estCostUsd: a.estCostUsd })),
      operatorLocked,
    },
  };
}
