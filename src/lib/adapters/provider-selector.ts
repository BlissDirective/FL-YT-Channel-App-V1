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
import {
  clampDuration,
  getVideoModel,
  isVideoModelLocked,
  modelProvider,
  resolveLockedModelId,
  VIDEO_MODELS,
  type VideoModel,
} from "./video-models";
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
  // Per-provider breakers: a fal outage benches only fal families and a
  // Higgsfield outage only Higgsfield — the other provider keeps working.
  for (const provider of ["fal", "higgsfield"] as const) {
    try {
      const outage = await providerOutage(db, provider);
      if (!outage.down) continue;
      for (const m of VIDEO_MODELS) {
        if (modelProvider(m) === provider) health[modelFamily(m.id)] = 0.05;
      }
    } catch {
      /* breaker unavailable → treat as healthy */
    }
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
  /** The project's locked model (Cinema Studio 4.0 or Seedance 2.5). */
  lockedModelId?: string | null;
}): BeatModelChoice {
  const locked = lockedBeatChoice(opts);
  if (locked) return locked;
  const poolIds = new Set(tierCandidateIds(opts.tier, opts.custom, opts.lockedModelId));
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

/** Snap to the model's accepted durations — except a section longer than one
    generation, which the worker stitches at full length. */
function targetFor(model: VideoModel, targetSec: number): number {
  return targetSec > model.maxDurationSec ? Math.round(targetSec) : clampDuration(model, targetSec);
}

/**
 * Model lock (operator decision): while the lock is on and the locked model's
 * provider is healthy, EVERY non-custom beat runs on it — no cost trade-off
 * can outvote the operator. The remaining pool is still scored so the logged
 * alternatives form the fallback chain the worker walks on failure.
 * Returns null when the lock doesn't apply (custom tier, lock off, outage).
 */
function lockedBeatChoice(opts: Parameters<typeof selectBeatModel>[0]): BeatModelChoice | null {
  if (opts.tier === "custom" || opts.tier === "base" || !isVideoModelLocked()) return null;
  const model = getVideoModel(resolveLockedModelId(opts.lockedModelId));
  if (!model) return null;
  const family = modelFamily(model.id);
  if ((opts.health?.[family] ?? 1) < 0.2) return null; // provider down → score the fallbacks

  const fallbacks = tierCandidateIds(opts.tier, opts.custom, opts.lockedModelId)
    .filter((id) => id !== model.id)
    .map((id) => getVideoModel(id))
    .filter((m): m is VideoModel => Boolean(m))
    .map(toCandidate);
  const ranked = fallbacks.length
    ? scoreProviders(fallbacks, {
        shot: opts.shot,
        targetSec: opts.targetSec,
        needsAudio: opts.needsAudio,
        budgetRemainingUsd: Number.POSITIVE_INFINITY,
        health: opts.health,
      })
    : null;
  const alternatives = ranked
    ? [ranked.winner, ...ranked.alternatives]
        .slice(0, 3)
        .map((a) => ({ id: a.id, label: a.label, total: a.total, estCostUsd: a.estCostUsd }))
    : [];
  const targetSec = targetFor(model, opts.targetSec);
  return {
    modelId: model.id,
    targetSec,
    family,
    selection: {
      model: model.id,
      rationale: `Locked default: ${model.label} for every section (operator decision). Fallbacks: ${alternatives.map((a) => a.label).join(" → ") || "none"}.`,
      score: 1,
      estCostUsd: Math.round(model.usdPerSec * targetSec * 100) / 100,
      dims: {} as SelectionLog["dims"],
      weights: (ranked?.weights ?? {}) as SelectionLog["weights"],
      alternatives,
      operatorLocked: true,
    },
  };
}
