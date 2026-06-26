import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { startBuildRun, zonedTimeToUtc, ymdInTz, type BuildRunConfig } from "@/lib/pipeline/engine";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import type { OperatorConfig, OperatorRun, Project } from "@/lib/db/types";

/**
 * Auto Pilot Operator — Phase A core. A per-channel supervisor that seeds one
 * video/day at a fixed slot under a 30-day budget, reusing Build & Post for the
 * heavy lifting (idea research, script, assets, render) and the auto-fix loop for
 * quality. Operator-owned videos hold at FINAL_REVIEW for approval (the finalizer
 * defers them). See docs/Auto-Pilot-Operator-build-plan.md.
 */

type Db = ReturnType<typeof createAdminClient>;

const CYCLE_MS = 30 * 24 * 60 * 60 * 1000; // 30-day budget cycle

const DEFAULTS: Required<OperatorConfig> = {
  postingHour: 13, // 1:00 PM
  postingTz: "America/Chicago", // CST/CDT
  dailyCap: 1,
  mixShortsPct: 0.75,
  shortsCapUsd: 1.0,
  longCapUsd: 4.5,
  shortsTier: "base",
  longTier: "economy",
  shortLenMin: 30,
  shortLenMax: 180,
  longLenMin: 180,
  longLenMax: 420,
  autoApproveHours: 15,
  autoApproveQc: 8.5,
  thumbStyle: "cinematic",
};

export function operatorConfig(run: Pick<OperatorRun, "config">): Required<OperatorConfig> {
  return { ...DEFAULTS, ...(run.config ?? {}) };
}

// ── Lifecycle ─────────────────────────────────────────────────────────

async function liveRun(db: Db, projectId: string): Promise<OperatorRun | null> {
  const { data } = await db
    .from("operator_runs")
    .select("*")
    .eq("project_id", projectId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  return (data as OperatorRun) ?? null;
}

export async function getOperatorRun(db: Db, projectId: string): Promise<OperatorRun | null> {
  return liveRun(db, projectId);
}

/** Start (or resume) the operator for a project. The 30-day budget cycle is
    anchored to the FIRST start; resuming a paused run keeps its anchor. */
export async function startOperator(
  db: Db,
  projectId: string,
  config?: OperatorConfig,
): Promise<{ ok: boolean; run?: OperatorRun; error?: string }> {
  const existing = await liveRun(db, projectId);
  if (existing) {
    if (existing.status === "paused") {
      const { data } = await db
        .from("operator_runs")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      return { ok: true, run: data as OperatorRun };
    }
    return { ok: true, run: existing }; // already active
  }
  const { data, error } = await db
    .from("operator_runs")
    .insert({
      project_id: projectId,
      status: "active",
      cycle_start: new Date().toISOString(),
      cycle_budget_usd: 60,
      config: config ?? {},
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, run: data as OperatorRun };
}

export async function pauseOperator(db: Db, projectId: string): Promise<{ ok: boolean }> {
  const run = await liveRun(db, projectId);
  if (!run) return { ok: false };
  await db.from("operator_runs").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", run.id);
  return { ok: true };
}

export async function stopOperator(db: Db, projectId: string): Promise<{ ok: boolean }> {
  const run = await liveRun(db, projectId);
  if (!run) return { ok: false };
  await db.from("operator_runs").update({ status: "stopped", updated_at: new Date().toISOString() }).eq("id", run.id);
  return { ok: true };
}

// ── Budget cycle ──────────────────────────────────────────────────────

/** Total channel spend since the cycle anchor (summed from the ledger — no
    counter to drift). All project spend counts against the $60. */
export async function cycleSpentUsd(db: Db, run: OperatorRun): Promise<number> {
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("project_id", run.project_id)
    .gte("at", run.cycle_start);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Roll the 30-day cycle forward in whole 30-day steps when due (a fresh budget
    each cycle, anchored to the original start). Pauses don't extend the clock. */
async function rollCycleIfDue(db: Db, run: OperatorRun): Promise<OperatorRun> {
  let start = new Date(run.cycle_start).getTime();
  const now = Date.now();
  let rolled = false;
  while (now >= start + CYCLE_MS) {
    start += CYCLE_MS;
    rolled = true;
  }
  if (rolled) {
    const iso = new Date(start).toISOString();
    await db.from("operator_runs").update({ cycle_start: iso, updated_at: new Date().toISOString() }).eq("id", run.id);
    run.cycle_start = iso;
  }
  return run;
}

// ── Scheduling + cadence ──────────────────────────────────────────────

/** The next occurrence of `hour`:00 wall-clock in `tz`, as a UTC Date. */
function nextSlotUtc(now: Date, hour: number, tz: string): Date {
  const t = ymdInTz(now, tz);
  let dt = zonedTimeToUtc(t.y, t.m - 1, t.day, hour, 0, tz);
  if (dt.getTime() <= now.getTime()) dt = zonedTimeToUtc(t.y, t.m - 1, t.day + 1, hour, 0, tz);
  return dt;
}

/** Start of the current local day in `tz`, as a UTC Date. */
function startOfTodayUtc(now: Date, tz: string): Date {
  const t = ymdInTz(now, tz);
  return zonedTimeToUtc(t.y, t.m - 1, t.day, 0, 0, tz);
}

async function seededTodayCount(db: Db, run: OperatorRun, tz: string): Promise<number> {
  const since = startOfTodayUtc(new Date(), tz).toISOString();
  const { count } = await db
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("operator_run_id", run.id)
    .gte("created_at", since);
  return count ?? 0;
}

async function cycleFormatCounts(db: Db, run: OperatorRun): Promise<{ shorts: number; long: number; total: number }> {
  const { data } = await db
    .from("videos")
    .select("kind")
    .eq("operator_run_id", run.id)
    .gte("created_at", run.cycle_start);
  const rows = (data ?? []) as { kind: string }[];
  const shorts = rows.filter((r) => r.kind === "short").length;
  return { shorts, long: rows.length - shorts, total: rows.length };
}

/** Deterministic 75/25-style rotation: every Nth video is long-form, where
    N derives from the configured Shorts share. (Metric-driven tilt: Phase E.) */
function pickFormat(total: number, mixShortsPct: number): "short" | "long" {
  const longEvery = Math.max(2, Math.round(1 / Math.max(0.01, 1 - mixShortsPct)));
  return total % longEvery === longEvery - 1 ? "long" : "short";
}

// ── The per-run tick ──────────────────────────────────────────────────

export type OperatorTick =
  | { acted: false; reason: string; spentUsd?: number }
  | { acted: true; kind: "short" | "long"; title?: string };

/** Advance one operator run one step: roll the cycle, then (if active, under
    budget, and the day's slot is unfilled) seed today's video via Build & Post. */
export async function tickOperator(db: Db, run: OperatorRun, project: Project): Promise<OperatorTick> {
  await rollCycleIfDue(db, run);
  if (run.status !== "active") return { acted: false, reason: run.status };

  const cfg = operatorConfig(run);
  const spent = await cycleSpentUsd(db, run);
  const remaining = Number(run.cycle_budget_usd) - spent;
  if (remaining <= 0) return { acted: false, reason: "budget-exhausted", spentUsd: spent };

  if ((await seededTodayCount(db, run, cfg.postingTz)) >= cfg.dailyCap) {
    return { acted: false, reason: "already-seeded-today", spentUsd: spent };
  }

  // Choose today's format from the running mix, and refuse it if its cap won't
  // fit the remaining pool (never start a video we can't afford).
  const counts = await cycleFormatCounts(db, run);
  const kind = pickFormat(counts.total, cfg.mixShortsPct);
  const isShort = kind === "short";
  const cap = isShort ? cfg.shortsCapUsd : cfg.longCapUsd;
  if (remaining < cap) {
    // If a long won't fit but a short would, fall back to a short this slot.
    if (!isShort && remaining >= cfg.shortsCapUsd) {
      return seedVideo(db, run, project, "short", cfg);
    }
    return { acted: false, reason: "insufficient-budget-for-slot", spentUsd: spent };
  }
  return seedVideo(db, run, project, kind, cfg);
}

async function seedVideo(
  db: Db,
  run: OperatorRun,
  project: Project,
  kind: "short" | "long",
  cfg: Required<OperatorConfig>,
): Promise<OperatorTick> {
  const isShort = kind === "short";
  const buildCfg: BuildRunConfig = {
    count: 1,
    kind,
    lengthMinSec: isShort ? cfg.shortLenMin : cfg.longLenMin,
    lengthMaxSec: isShort ? cfg.shortLenMax : cfg.longLenMax,
    tier: (isShort ? cfg.shortsTier : cfg.longTier) as AutoTier,
    thumbStyle: project.brand_kit?.thumbnailStyle ?? cfg.thumbStyle,
    ideaSource: "research", // fresh, researched idea each day (dedup guard: Phase C)
    scheduleMode: "all_at_once",
    scheduleCfg: {},
  };
  const res = await startBuildRun(run.project_id, buildCfg, db);
  if (!res.ok) return { acted: false, reason: res.error };

  // Claim the seeded video for the operator and stamp the day's publish slot.
  // It holds at FINAL_REVIEW for approval (the finalizer defers operator videos).
  const slot = nextSlotUtc(new Date(), cfg.postingHour, cfg.postingTz);
  await db
    .from("videos")
    .update({ operator_run_id: run.id, scheduled_publish_at: slot.toISOString() })
    .eq("build_run_id", res.runId);

  return { acted: true, kind };
}

// ── Sweep entry (cron) ────────────────────────────────────────────────

/** Tick every live operator run. Cron-called every ~30 min. */
export async function sweepOperator(
  dbArg?: Db,
): Promise<{ ticked: number; seeded: number }> {
  const db = dbArg ?? createAdminClient();
  const { data: runs } = await db
    .from("operator_runs")
    .select("*")
    .in("status", ["active", "paused"]);

  let ticked = 0;
  let seeded = 0;
  for (const run of ((runs ?? []) as OperatorRun[])) {
    const { data: p } = await db.from("projects").select("*").eq("id", run.project_id).maybeSingle();
    const project = p as Project | null;
    if (!project) continue;
    try {
      const out = await tickOperator(db, run, project);
      ticked += 1;
      if (out.acted) seeded += 1;
    } catch (err) {
      console.error(`operator tick ${run.id} failed:`, err);
    }
  }
  return { ticked, seeded };
}

// ── Snapshot (UI / digest) ────────────────────────────────────────────

export type OperatorSnapshot = {
  status: OperatorRun["status"];
  cycleStart: string;
  cycleDay: number;
  cycleDays: number;
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  seededToday: number;
  dailyCap: number;
  videosThisCycle: number;
  postingHour: number;
  postingTz: string;
};

export async function operatorSnapshot(db: Db, run: OperatorRun): Promise<OperatorSnapshot> {
  const cfg = operatorConfig(run);
  const spent = await cycleSpentUsd(db, run);
  const counts = await cycleFormatCounts(db, run);
  const dayMs = Date.now() - new Date(run.cycle_start).getTime();
  const cycleDay = Math.max(1, Math.min(30, Math.floor(dayMs / (24 * 60 * 60 * 1000)) + 1));
  return {
    status: run.status,
    cycleStart: run.cycle_start,
    cycleDay,
    cycleDays: 30,
    budgetUsd: Number(run.cycle_budget_usd),
    spentUsd: Math.round(spent * 100) / 100,
    remainingUsd: Math.round((Number(run.cycle_budget_usd) - spent) * 100) / 100,
    seededToday: await seededTodayCount(db, run, cfg.postingTz),
    dailyCap: cfg.dailyCap,
    videosThisCycle: counts.total,
    postingHour: cfg.postingHour,
    postingTz: cfg.postingTz,
  };
}
