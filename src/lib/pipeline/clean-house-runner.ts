import "server-only";
import {
  CLEAN_HOUSE_MAX_ROUNDS,
  cleanHouseBudgetStop,
  planCleanHouse,
  triageAsset,
  type AssetSignals,
  type AssetTriage,
  GATE_FOR_STATUS,
} from "@studio/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/admin-guard";
import { decideGate, isKillSwitchOn } from "@/lib/pipeline/engine";
import { getQualityGateConfig } from "@/lib/pipeline/quality-gates";
import { recordDecision } from "@/lib/pipeline/decisions";
import type { Video } from "@/lib/db/types";

/**
 * Clean House orchestrator (Clean-House-Build-Spec.md §3). Triage is free; the
 * executor advances each "advance" asset one forward step per tick through the
 * EXISTING gate/stage machinery (never re-implementing the pipeline), respecting
 * the per-run budget ceiling, the kill switch, the 2-round autofix cap (→ flag),
 * and pause/cancel. Admin-only. Stops at Ready (APPROVED) — never publishes;
 * never auto-kills (flags for manual handling).
 */

type Db = SupabaseClient;

async function requireAdmin(): Promise<boolean> {
  try {
    return await getIsAdmin();
  } catch {
    return false;
  }
}

/** Gather triage signals for a video from data already on hand (no spend). */
async function gatherSignals(db: Db, v: Video, qcFloor: number): Promise<AssetSignals> {
  const [{ data: qc }, { data: render }] = await Promise.all([
    db.from("qc_reviews").select("score").eq("video_id", v.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("assets").select("meta").eq("video_id", v.id).eq("kind", "render").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const mediaQc = (render?.meta as { mediaQc?: { hardFail?: boolean } } | null)?.mediaQc;
  const watch = (v.watch_review as { pass?: boolean } | null) ?? null;
  const autofixAttempts = Number((v.autofix_state as { attempts?: number } | null)?.attempts ?? 0);
  const { count: scriptCount } = await db
    .from("scripts")
    .select("id", { count: "exact", head: true })
    .eq("video_id", v.id);
  return {
    status: v.status,
    qcScore: qc ? Number(qc.score) : null,
    qcFloor,
    watchPass: watch ? Boolean(watch.pass) : null,
    mediaHardFail: Boolean(mediaQc?.hardFail),
    autofixAttempts,
    hasScript: (scriptCount ?? 0) > 0,
    pausedReason: v.paused_reason,
    archived: v.archived,
  };
}

export type TriageResult = { runId: string; plan: ReturnType<typeof planCleanHouse>; items: number };

/** Phase 1: build the triage plan (awaiting_approval). Admin-only, no spend. */
export async function triageCleanHouse(
  projectId: string,
  scope: { mode: "all" | "selected"; videoIds?: string[] },
): Promise<{ ok: boolean; error?: string; result?: TriageResult }> {
  if (!(await requireAdmin())) return { ok: false, error: "Admin only." };
  const db = await createClient();
  const cfg = await getQualityGateConfig(db);
  const qcFloor = Number(cfg.runFloor ?? 7);

  let q = db.from("videos").select("*").eq("project_id", projectId).is("parent_video_id", null).neq("status", "KILLED").eq("archived", false);
  if (scope.mode === "selected" && scope.videoIds?.length) q = q.in("id", scope.videoIds);
  const { data: vids } = await q;
  const videos = (vids ?? []) as Video[];
  if (videos.length === 0) return { ok: false, error: "No assets to triage." };

  const triages = await Promise.all(videos.map((v) => gatherSignals(db, v, qcFloor).then(triageAsset)));
  const plan = planCleanHouse(triages);

  const { data: run } = await db
    .from("clean_house_runs")
    .insert({ project_id: projectId, status: "awaiting_approval", scope, est_cost_usd: plan.estCostUsd })
    .select("id")
    .single();
  const runId = (run as { id: string }).id;

  await db.from("clean_house_items").insert(
    videos.map((v, i) => ({
      run_id: runId,
      video_id: v.id,
      salvageability: triages[i].salvageability,
      verdict: triages[i].verdict,
      est_cost_usd: triages[i].estCostUsd,
      actions: triages[i].actions,
    })),
  );

  return { ok: true, result: { runId, plan, items: videos.length } };
}

/** Phase 2: approve (with optional per-asset verdict overrides + ceiling) and
    start the run. Admin-only. */
export async function approveCleanHouseRun(
  runId: string,
  budgetCeilingUsd: number,
  overrides: { videoId: string; verdict: "advance" | "flag" | "skip" }[] = [],
): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "Admin only." };
  const db = await createClient();
  for (const o of overrides) {
    await db.from("clean_house_items").update({ verdict: o.verdict }).eq("run_id", runId).eq("video_id", o.videoId);
  }
  await db.from("clean_house_runs").update({ status: "running", budget_ceiling_usd: budgetCeilingUsd }).eq("id", runId);
  await advanceCleanHouseRun(runId);
  return { ok: true };
}

export async function pauseCleanHouseRun(runId: string): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  const db = await createClient();
  await db.from("clean_house_runs").update({ status: "paused" }).eq("id", runId);
  return { ok: true };
}

export async function cancelCleanHouseRun(runId: string): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  const db = await createClient();
  await db.from("clean_house_runs").update({ status: "cancelled" }).eq("id", runId);
  return { ok: true };
}

/** Flag an asset unfixable (red border + manual only) — never kills. */
async function flagUnfixable(db: Db, videoId: string, reason: string): Promise<void> {
  await db.from("videos").update({ flagged_unfixable: true, flag_reason: reason }).eq("id", videoId);
}

/**
 * One execution tick: advance each pending `advance` item one forward step
 * (respecting budget + kill switch + the 2-round cap), flag the `flag` items,
 * and finalize the run when every item is resolved. Idempotent + resumable —
 * re-tick (button or the operator cron) carries async work forward.
 */
export async function advanceCleanHouseRun(runId: string): Promise<{ ok: boolean; done?: boolean }> {
  const db = await createClient();
  const { data: run } = await db.from("clean_house_runs").select("*").eq("id", runId).maybeSingle();
  if (!run || run.status !== "running") return { ok: true };
  if (await isKillSwitchOn(db)) {
    await db.from("clean_house_runs").update({ status: "paused" }).eq("id", runId);
    return { ok: true };
  }

  const cfg = await getQualityGateConfig(db);
  const qcFloor = Number(cfg.runFloor ?? 7);
  const ceiling = Number(run.budget_ceiling_usd);
  let spent = Number(run.spent_usd);

  const { data: items } = await db.from("clean_house_items").select("*").eq("run_id", runId).is("outcome", null);
  const pending = (items ?? []) as { id: string; video_id: string; verdict: string; est_cost_usd: number }[];

  for (const item of pending) {
    if (item.verdict === "flag") {
      await flagUnfixable(db, item.video_id, "Clean House: unlikely to reach a passing score — manual kill or recreate.");
      await db.from("clean_house_items").update({ outcome: "flagged" }).eq("id", item.id);
      continue;
    }
    if (item.verdict === "skip") {
      await db.from("clean_house_items").update({ outcome: "skipped" }).eq("id", item.id);
      continue;
    }

    const { data: vRow } = await db.from("videos").select("*").eq("id", item.video_id).maybeSingle();
    const v = vRow as Video | null;
    if (!v) { await db.from("clean_house_items").update({ outcome: "skipped" }).eq("id", item.id); continue; }

    // Already at Ready → done.
    if (v.status === "APPROVED") { await db.from("clean_house_items").update({ outcome: "ready" }).eq("id", item.id); continue; }

    const signals = await gatherSignals(db, v, qcFloor);
    const t = triageAsset(signals);

    // Re-triage may now flag it (e.g. autofix exhausted since planning).
    if (t.verdict === "flag") {
      await flagUnfixable(db, item.video_id, t.reasons.join("; "));
      await db.from("clean_house_items").update({ outcome: "flagged" }).eq("id", item.id);
      continue;
    }

    const gate = GATE_FOR_STATUS[v.status];
    // A worker-stage asset (scripting/generating/assembling/revision) is already
    // in flight — leave it for the workers; a later tick advances it.
    if (gate === undefined) continue;

    // Budget gate before any paid forward step.
    if (cleanHouseBudgetStop(spent, ceiling, item.est_cost_usd)) continue;

    // At the FINAL gate, only approve a PASSING cut; a failing one gets a
    // revision (under the cap) or is flagged (at the cap).
    if (v.status === "FINAL_REVIEW" && signals.qcScore != null && signals.qcScore < qcFloor) {
      if (signals.autofixAttempts >= CLEAN_HOUSE_MAX_ROUNDS) {
        await flagUnfixable(db, item.video_id, `QC ${signals.qcScore.toFixed(1)} < floor ${qcFloor} after ${signals.autofixAttempts} rounds.`);
        await db.from("clean_house_items").update({ outcome: "flagged" }).eq("id", item.id);
        continue;
      }
      await decideGate({ videoId: v.id, decision: "revision", notes: "Clean House: QC below floor" }, db, "autopilot");
      await recordDecision(db, { projectId: v.project_id, videoId: v.id, kind: "regenerate", choice: "revision", reasoning: "Clean House revision (QC below floor)", params: { runId } });
      continue;
    }

    // Approve this gate → advance one step (triggers the next stage's worker).
    await decideGate({ videoId: v.id, decision: "approved", notes: "Clean House" }, db, "autopilot");
    spent = Math.round((spent + item.est_cost_usd) * 100) / 100;
    await db.from("clean_house_items").update({ spent_usd: item.est_cost_usd }).eq("id", item.id);
    await recordDecision(db, {
      projectId: v.project_id, videoId: v.id, kind: "regenerate",
      choice: `advance:${v.status}`, reasoning: "Clean House advanced a gate", costUsd: item.est_cost_usd, params: { runId },
    });
  }

  await db.from("clean_house_runs").update({ spent_usd: spent }).eq("id", runId);

  // Finalize when nothing is left pending.
  const { count: stillPending } = await db
    .from("clean_house_items")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .is("outcome", null);
  if ((stillPending ?? 0) === 0) {
    await db.from("clean_house_runs").update({ status: "done" }).eq("id", runId);
    return { ok: true, done: true };
  }
  return { ok: true, done: false };
}

/** The active (running/paused/awaiting) run for a project + its item outcomes. */
export async function getActiveCleanHouseRun(projectId: string): Promise<{
  run: { id: string; status: string; est_cost_usd: number; spent_usd: number; budget_ceiling_usd: number } | null;
  counts: { advance: number; flag: number; skip: number; ready: number; flagged: number; pending: number };
} | null> {
  const db = await createClient();
  const { data: run } = await db
    .from("clean_house_runs")
    .select("id, status, est_cost_usd, spent_usd, budget_ceiling_usd")
    .eq("project_id", projectId)
    .in("status", ["awaiting_approval", "running", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return { run: null, counts: { advance: 0, flag: 0, skip: 0, ready: 0, flagged: 0, pending: 0 } };
  const { data: items } = await db.from("clean_house_items").select("verdict, outcome").eq("run_id", run.id);
  const rows = (items ?? []) as { verdict: string; outcome: string | null }[];
  return {
    run,
    counts: {
      advance: rows.filter((r) => r.verdict === "advance").length,
      flag: rows.filter((r) => r.verdict === "flag").length,
      skip: rows.filter((r) => r.verdict === "skip").length,
      ready: rows.filter((r) => r.outcome === "ready").length,
      flagged: rows.filter((r) => r.outcome === "flagged").length,
      pending: rows.filter((r) => r.outcome == null).length,
    },
  };
}
