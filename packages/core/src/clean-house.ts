/**
 * Clean House triage core (Clean-House-Build-Spec.md §3).
 *
 * Pure scoring that decides, per asset, whether it is SALVAGEABLE (feasible to
 * reach a passing final score) or should be FLAGGED for manual handling — plus
 * a cost estimate to advance it and the run-level budget-ceiling stop. All from
 * signals the app already has (QC score, watch pass, media QC, autofix attempts,
 * stage) — the triage spends nothing. The app persists the plan + drives the
 * existing stage runners; this module just judges + budgets.
 */
import type { VideoStatus } from "./state-machine";

/** Everything the triage needs about one asset — all already on hand. */
export type AssetSignals = {
  status: VideoStatus;
  /** Latest QC score (0..10) or null if never scored. */
  qcScore: number | null;
  /** The passing floor for this project. */
  qcFloor: number;
  /** Watch/Self-Watch gate passed? null = not yet watched. */
  watchPass: boolean | null;
  /** Media/technical QC had a HARD structural defect. */
  mediaHardFail: boolean;
  /** How many autofix rounds have already run on this asset. */
  autofixAttempts: number;
  /** A script exists (so we're not starting from nothing). */
  hasScript: boolean;
  /** Persistently held with a failure reason. */
  pausedReason: string | null;
  archived?: boolean;
};

export type CleanHouseVerdict = "advance" | "flag" | "skip";

export type AssetTriage = {
  salvageability: number; // 0..1
  verdict: CleanHouseVerdict;
  reasons: string[];
  estCostUsd: number;
  /** The forward steps needed (human-readable). */
  actions: string[];
};

/** The max autofix rounds before Clean House declares an asset unfixable
    (mirrors the reviewer 2-round cap, B7). */
export const CLEAN_HOUSE_MAX_ROUNDS = 2;

// Rough remediation cost by how far the asset still has to travel (USD).
const STAGE_REMAINING_COST: Partial<Record<VideoStatus, number>> = {
  IDEA: 3.5, IDEA_APPROVED: 3.2, SCRIPTING: 3.0, SCRIPT_READY: 2.6,
  GENERATING_ASSETS: 1.8, ASSETS_READY: 1.4, ASSEMBLING: 0.4,
  FINAL_REVIEW: 0.3, NEEDS_REVISION: 2.4, APPROVED: 0, TRACKING: 0, KILLED: 0,
};

/**
 * Triage one asset. Salvageability drops for repeated autofix failure, a QC
 * score far below the floor, and hard structural defects; it's high for assets
 * simply parked at a gate or mid-pipeline. Below the flag threshold → flag.
 * Pure + deterministic.
 */
export function triageAsset(s: AssetSignals): AssetTriage {
  if (s.archived || s.status === "KILLED" || s.status === "TRACKING") {
    return { salvageability: 0, verdict: "skip", reasons: ["already terminal/archived"], estCostUsd: 0, actions: [] };
  }

  const reasons: string[] = [];
  const actions: string[] = [];
  let score = 0.7; // default: most assets are advanceable

  // Repeated autofix failure is the strongest "unfixable" signal.
  if (s.autofixAttempts >= CLEAN_HOUSE_MAX_ROUNDS) {
    score -= 0.4;
    reasons.push(`autofix exhausted (${s.autofixAttempts} rounds)`);
  } else if (s.autofixAttempts === 1) {
    score -= 0.1;
  }

  // QC score relative to the floor.
  if (s.qcScore != null) {
    const gap = s.qcScore - s.qcFloor;
    if (gap >= 0) { score += 0.15; reasons.push(`QC ${s.qcScore.toFixed(1)} ≥ floor`); }
    else if (gap >= -1.5) { score -= 0.1; actions.push("autofix to clear the QC floor"); }
    else { score -= 0.3; reasons.push(`QC ${s.qcScore.toFixed(1)} far below floor`); actions.push("rewrite script + regenerate"); }
  }

  if (s.mediaHardFail) { score -= 0.2; actions.push("re-render (structural defect)"); reasons.push("media QC hard-fail"); }
  if (!s.hasScript && s.status !== "IDEA" && s.status !== "IDEA_APPROVED") { score -= 0.05; actions.push("write script"); }
  if (s.pausedReason && /fail|error|can.?t|unable/i.test(s.pausedReason)) { score -= 0.1; reasons.push("held on a failure"); }

  // Forward steps implied by the current stage.
  const stageAction = forwardActionFor(s.status);
  if (stageAction) actions.push(stageAction);

  score = Math.max(0, Math.min(1, score));
  const verdict: CleanHouseVerdict = score < 0.35 ? "flag" : "advance";
  if (verdict === "flag") reasons.push("below salvageability threshold — manual only");

  return {
    salvageability: Math.round(score * 100) / 100,
    verdict,
    reasons,
    estCostUsd: verdict === "advance" ? estimateRemediationUsd(s) : 0,
    actions: [...new Set(actions)],
  };
}

function forwardActionFor(status: VideoStatus): string | null {
  switch (status) {
    case "IDEA": case "IDEA_APPROVED": return "approve idea → script";
    case "SCRIPTING": case "SCRIPT_READY": return "approve script → assets";
    case "GENERATING_ASSETS": case "ASSETS_READY": return "generate assets → render";
    case "ASSEMBLING": case "FINAL_REVIEW": return "render → final review";
    case "NEEDS_REVISION": return "run revision";
    default: return null;
  }
}

/** Estimated USD to advance an asset from its current stage to Ready. Pure. */
export function estimateRemediationUsd(s: AssetSignals): number {
  let cost = STAGE_REMAINING_COST[s.status] ?? 2;
  // A far-below-floor asset needs a rewrite + full regen — count from the top.
  if (s.qcScore != null && s.qcScore < s.qcFloor - 1.5) cost = Math.max(cost, 3);
  if (s.mediaHardFail) cost += 0.4;
  return Math.round(cost * 100) / 100;
}

export type CleanHousePlan = {
  advance: number;
  flag: number;
  skip: number;
  estCostUsd: number;
};

/** Roll per-asset triages into a run plan. Pure. */
export function planCleanHouse(triages: AssetTriage[]): CleanHousePlan {
  const advance = triages.filter((t) => t.verdict === "advance");
  return {
    advance: advance.length,
    flag: triages.filter((t) => t.verdict === "flag").length,
    skip: triages.filter((t) => t.verdict === "skip").length,
    estCostUsd: Math.round(advance.reduce((s, t) => s + t.estCostUsd, 0) * 100) / 100,
  };
}

/**
 * Whether the run must STOP before doing the next item (budget ceiling). Pure —
 * the executor calls this before each paid advance so a run never overruns.
 */
export function cleanHouseBudgetStop(spentUsd: number, ceilingUsd: number, nextCostUsd: number): boolean {
  if (ceilingUsd <= 0) return false; // 0 = no ceiling
  return spentUsd + nextCostUsd > ceilingUsd + 1e-9;
}

// ── Auto-advance guardrails (Clean-House-Build-Spec.md §3 follow-up) ─────────
// A Clean House run advances hands-off across many cron ticks. These pure
// helpers bound that autonomy: a hard stop on REAL ledger spend, a per-tick
// concurrency cap on paid work, stall handling for in-flight assets, and
// termination rails so a wedged run auto-pauses instead of looping forever.

/** Max paid gate advances a single tick may trigger (concurrency throttle).
    Keeps one sweep from firing a burst of expensive stage workers at once. */
export const CLEAN_HOUSE_MAX_ADVANCES_PER_TICK = 3;

/** Hard ceiling on ticks for one run before the rails auto-pause it. */
export const CLEAN_HOUSE_MAX_TICKS = 60;

/** Consecutive no-progress ticks tolerated before the rails auto-pause. */
export const CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS = 6;

/** Minutes an asset may sit in a worker stage before a nudge, then a flag. */
export const CLEAN_HOUSE_STALL_MINUTES = 30;
/** How many nudges an in-flight asset gets before it's flagged as stalled. */
export const CLEAN_HOUSE_MAX_NUDGES = 2;

/**
 * The AUTHORITATIVE budget stop: real reconciled spend from the cost ledger vs
 * the run's ceiling. Unlike cleanHouseBudgetStop (which works off estimates
 * before a step), this gates on money actually recorded — the hard stop that
 * makes the ceiling a true ceiling even if estimates were low. Pure.
 */
export function cleanHouseLedgerStop(ledgerSpentUsd: number, ceilingUsd: number): boolean {
  if (ceilingUsd <= 0) return false; // 0 = no ceiling
  return ledgerSpentUsd >= ceilingUsd - 1e-9;
}

/**
 * The run's COMMITTED spend for budget gating: the greater of real reconciled
 * ledger spend and the accumulated pre-flight estimate.
 *
 * The ledger LAGS. Clean House commits an advance by flagging an MVDA cut
 * (`edit_session_requested`) or triggering a stage worker (clips/render) — and
 * those book their real cost minutes-to-hours later, on a separate runner. So a
 * ledger-only stop sees almost nothing and keeps authorizing work: a $25 run
 * committed $75 of advances before any of it settled. Taking the max keeps the
 * ceiling honest in BOTH directions — the estimate caps forward commitments the
 * ledger hasn't caught up to, and the ledger still enforces if real cost ends up
 * outrunning the estimate. Pure.
 */
export function cleanHouseCommittedSpend(ledgerSpentUsd: number, estimatedSpentUsd: number): number {
  return Math.max(ledgerSpentUsd, estimatedSpentUsd);
}

export type CleanHouseRailState = { tickCount: number; noProgressTicks: number };

/** Termination rails: should the run auto-pause (and why)? Pure. */
export function cleanHouseTerminationStop(s: CleanHouseRailState): { stop: boolean; reason?: string } {
  if (s.tickCount >= CLEAN_HOUSE_MAX_TICKS) {
    return { stop: true, reason: `reached the ${CLEAN_HOUSE_MAX_TICKS}-tick ceiling without finishing` };
  }
  if (s.noProgressTicks >= CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS) {
    return { stop: true, reason: `no progress for ${CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS} consecutive ticks` };
  }
  return { stop: false };
}

// ── Budget allocation strategy (Precision-Editing-and-Clean-House-v2-Spec §A) ─
// A capped budget should fund the best bets first, not arbitrary insertion
// order. The operator picks a strategy; these pure helpers rank the work queue
// and compute the budget frontier for the plan preview.

export type CleanHouseBudgetStrategy = "salvageability" | "cheapest" | "closest-to-floor";

/** The fields a rankable item needs (camelCase; the runner maps DB rows in). */
export type BudgetRankable = {
  salvageability: number;
  estCostUsd: number;
  qcScore: number | null;
  qcFloor: number;
};

/** QC gap to the floor; null score → Infinity (ranks last for closest-to-floor). */
function floorGap(i: BudgetRankable): number {
  return i.qcScore == null ? Number.POSITIVE_INFINITY : Math.max(0, i.qcFloor - i.qcScore);
}

/**
 * Order a set of advance items by the chosen budget strategy. Pure + stable
 * enough for tests (deterministic tie-breaks). Generic so the runner can rank
 * its own row type as long as it carries the BudgetRankable fields.
 */
export function rankForBudget<T extends BudgetRankable>(items: T[], strategy: CleanHouseBudgetStrategy): T[] {
  const arr = [...items];
  switch (strategy) {
    case "cheapest":
      arr.sort((a, b) => a.estCostUsd - b.estCostUsd || b.salvageability - a.salvageability);
      break;
    case "closest-to-floor":
      arr.sort((a, b) => floorGap(a) - floorGap(b) || a.estCostUsd - b.estCostUsd);
      break;
    case "salvageability":
    default:
      arr.sort((a, b) => b.salvageability - a.salvageability || a.estCostUsd - b.estCostUsd);
  }
  return arr;
}

/**
 * Greedily walk already-ranked items, funding each while cumulative estimated
 * cost stays under the ceiling. ceiling <= 0 → no ceiling (fund all). Pure.
 */
export function planWithinBudget<T extends { estCostUsd: number }>(
  rankedItems: T[],
  ceilingUsd: number,
): { funded: T[]; deferred: T[]; fundedCostUsd: number } {
  if (ceilingUsd <= 0) {
    const total = rankedItems.reduce((s, i) => s + i.estCostUsd, 0);
    return { funded: [...rankedItems], deferred: [], fundedCostUsd: Math.round(total * 100) / 100 };
  }
  const funded: T[] = [];
  const deferred: T[] = [];
  let spent = 0;
  for (const it of rankedItems) {
    if (spent + it.estCostUsd <= ceilingUsd + 1e-9) { funded.push(it); spent += it.estCostUsd; }
    else deferred.push(it);
  }
  return { funded, deferred, fundedCostUsd: Math.round(spent * 100) / 100 };
}

export type CleanHouseStallVerdict = "wait" | "nudge" | "flag";

/**
 * What to do with an asset sitting in a worker stage. Under the stall window →
 * wait. Past it, with nudges left → nudge (re-trigger the worker). Out of
 * nudges → flag it as stalled (manual only — never auto-killed). Pure.
 */
export function cleanHouseStallAction(inflightMinutes: number, nudges: number): CleanHouseStallVerdict {
  if (inflightMinutes < CLEAN_HOUSE_STALL_MINUTES) return "wait";
  if (nudges >= CLEAN_HOUSE_MAX_NUDGES) return "flag";
  return "nudge";
}
