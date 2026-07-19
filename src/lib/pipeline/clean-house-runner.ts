import "server-only";
import {
  CLEAN_HOUSE_MAX_ADVANCES_PER_TICK,
  CLEAN_HOUSE_MAX_ROUNDS,
  cleanHouseBudgetStop,
  cleanHouseLedgerStop,
  cleanHouseStallAction,
  cleanHouseTerminationStop,
  planCleanHouse,
  triageAsset,
  type AssetSignals,
  type VideoStatus,
  GATE_FOR_STATUS,
} from "@studio/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIsAdmin } from "@/lib/admin-guard";
import { decideGate, isKillSwitchOn } from "@/lib/pipeline/engine";
import { getQualityGateConfig } from "@/lib/pipeline/quality-gates";
import { recordDecision } from "@/lib/pipeline/decisions";
import { dispatchWorkflow, ghDispatchConfigured } from "@/lib/adapters/gh-dispatch";
import { isTelegramLive, sendTelegram } from "@/lib/adapters/telegram";
import type { Video } from "@/lib/db/types";

/** A run holds its lock for at most this long; a staler claim is reclaimable so
    a crashed tick never wedges the run. */
const LOCK_LEASE_MS = 5 * 60 * 1000;

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
  const db = createAdminClient();
  const cfg = await getQualityGateConfig(db);
  const qcFloor = Number(cfg.runFloor ?? 7);

  let q = db.from("videos").select("*").eq("project_id", projectId).is("parent_video_id", null).neq("status", "KILLED").eq("archived", false);
  if (scope.mode === "selected" && scope.videoIds?.length) q = q.in("id", scope.videoIds);
  const { data: vids } = await q;
  const videos = (vids ?? []) as Video[];
  if (videos.length === 0) return { ok: false, error: "No assets to triage." };

  const triages = await Promise.all(videos.map((v) => gatherSignals(db, v, qcFloor).then(triageAsset)));
  const plan = planCleanHouse(triages);

  const { data: run, error: runErr } = await db
    .from("clean_house_runs")
    .insert({ project_id: projectId, status: "awaiting_approval", scope, est_cost_usd: plan.estCostUsd })
    .select("id")
    .single();
  if (runErr || !run) {
    return { ok: false, error: `Could not start a run: ${runErr?.message ?? "no row returned"}` };
  }
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
  const db = createAdminClient();
  for (const o of overrides) {
    await db.from("clean_house_items").update({ verdict: o.verdict }).eq("run_id", runId).eq("video_id", o.videoId);
  }
  await db.from("clean_house_runs").update({ status: "running", budget_ceiling_usd: budgetCeilingUsd }).eq("id", runId);
  await advanceCleanHouseRun(runId);
  return { ok: true };
}

export async function pauseCleanHouseRun(runId: string): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  const db = createAdminClient();
  await db.from("clean_house_runs").update({ status: "paused" }).eq("id", runId);
  return { ok: true };
}

export async function cancelCleanHouseRun(runId: string): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  const db = createAdminClient();
  await db.from("clean_house_runs").update({ status: "cancelled" }).eq("id", runId);
  return { ok: true };
}

/** Flag an asset unfixable (red border + manual only) — never kills. */
async function flagUnfixable(db: Db, videoId: string, reason: string): Promise<void> {
  await db.from("videos").update({ flagged_unfixable: true, flag_reason: reason }).eq("id", videoId);
}

type RunRow = {
  id: string; project_id: string; status: string; budget_ceiling_usd: number;
  spent_usd: number; created_at: string; tick_count: number;
  no_progress_ticks: number; last_progress: number;
};
type ItemRow = {
  id: string; video_id: string; verdict: string; est_cost_usd: number;
  inflight_since: string | null; nudges: number;
};

/** Real reconciled spend the run is responsible for: ledger entries booked
    against the run's assets since the run began. This is the AUTHORITATIVE
    number the hard budget stop gates on — not the pre-flight estimate. */
async function ledgerSpentForRun(db: Db, run: RunRow, videoIds: string[]): Promise<number> {
  if (videoIds.length === 0) return 0;
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .in("video_id", videoIds)
    .gte("at", run.created_at);
  return Math.round((data ?? []).reduce((s, r) => s + Number((r as { usd: number }).usd), 0) * 100) / 100;
}

/** Auto-pause the run, record why, release the lock, and notify. Never kills. */
async function pauseRunWithReason(db: Db, run: RunRow, reason: string): Promise<{ ok: boolean; paused: true; reason: string }> {
  await db
    .from("clean_house_runs")
    .update({ status: "paused", paused_reason: reason, locked_at: null })
    .eq("id", run.id);
  await notifyCleanHouse(db, run, `paused — ${reason}. Resolve, then resume from the Library.`);
  return { ok: true, paused: true, reason };
}

/** The GitHub worker to re-trigger when nudging a stalled in-flight asset. */
function stallWorkflowFor(status: VideoStatus): string | null {
  switch (status) {
    case "ASSEMBLING": return "render.yml";
    case "GENERATING_ASSETS": case "ASSETS_READY": return "clips.yml";
    case "SCRIPTING": case "IDEA_APPROVED": case "NEEDS_REVISION": return "build-runner.yml";
    default: return null;
  }
}

/**
 * Handle an asset that's sitting in an async worker stage. Inside the stall
 * window → wait. Past it → nudge the worker (bounded). Out of nudges → flag it
 * (manual only — never auto-killed). Returns true if it flagged the item.
 */
async function handleStall(db: Db, item: ItemRow, v: Video, nowIso: string): Promise<boolean> {
  if (!item.inflight_since) {
    // First time we've seen it in-flight this run — start the stall clock.
    await db.from("clean_house_items").update({ inflight_since: nowIso }).eq("id", item.id);
    return false;
  }
  const minutes = (Date.parse(nowIso) - Date.parse(item.inflight_since)) / 60000;
  const action = cleanHouseStallAction(minutes, item.nudges);
  if (action === "wait") return false;
  if (action === "nudge") {
    const wf = stallWorkflowFor(v.status);
    if (wf && ghDispatchConfigured()) await dispatchWorkflow(wf);
    await db.from("clean_house_items").update({ nudges: item.nudges + 1, inflight_since: nowIso }).eq("id", item.id);
    return false;
  }
  // Out of nudges: flag as stalled.
  await flagUnfixable(db, item.video_id, `Stalled in ${v.status} — no progress after ${item.nudges} nudges. Manual attention needed.`);
  await db.from("clean_house_items").update({ outcome: "flagged" }).eq("id", item.id);
  return true;
}

/** Telegram notification (no-op when Telegram isn't configured). */
async function notifyCleanHouse(db: Db, run: RunRow, message: string): Promise<void> {
  if (!isTelegramLive()) return;
  const { data: proj } = await db.from("projects").select("name").eq("id", run.project_id).maybeSingle();
  const name = (proj as { name?: string } | null)?.name ?? "a project";
  await sendTelegram(`🧹 <b>Clean House</b> — <b>${name}</b>: ${message}`);
}

/**
 * One execution tick, safe to fire from the button OR the cron at any cadence.
 *
 * Guardrails, in order: an ATOMIC lock claim (no double-run), the kill switch,
 * the termination rails (max-ticks / no-progress → auto-pause + escalate), the
 * REAL-ledger hard budget stop, then per-item work — flag/skip, re-triage,
 * stall handling for in-flight assets, and up to N paid gate advances (the
 * per-tick concurrency throttle). Finalizes to `done` when every item resolves.
 * Never publishes; never auto-kills (flags only). Idempotent + resumable.
 */
export async function advanceCleanHouseRun(runId: string): Promise<{ ok: boolean; done?: boolean; paused?: boolean; reason?: string }> {
  const db = createAdminClient();
  return advanceCleanHouseRunWith(db, runId);
}

/** The tick implementation, parameterized by client so the button (user
    session) and the cron (service role) share exactly one code path. */
async function advanceCleanHouseRunWith(db: Db, runId: string): Promise<{ ok: boolean; done?: boolean; paused?: boolean; reason?: string }> {
  const nowIso = new Date().toISOString();

  // 1) ATOMIC LOCK CLAIM (idempotency / double-run lock). Only a `running` run
  //    with a free (or stale) lock is claimable; the loser matches zero rows.
  const leaseCutoff = new Date(Date.now() - LOCK_LEASE_MS).toISOString();
  const { data: claimedRows } = await db
    .from("clean_house_runs")
    .update({ locked_at: nowIso })
    .eq("id", runId)
    .eq("status", "running")
    .or(`locked_at.is.null,locked_at.lt.${leaseCutoff}`)
    .select("*");
  const run = (claimedRows?.[0] as RunRow | undefined) ?? null;
  if (!run) return { ok: true }; // not running, or the lock is held elsewhere

  try {
    // 2) Kill switch → pause immediately.
    if (await isKillSwitchOn(db)) return await pauseRunWithReason(db, run, "the kill switch is on");

    // 3) Termination rails (based on the PRIOR tick's counters).
    const rail = cleanHouseTerminationStop({ tickCount: run.tick_count, noProgressTicks: run.no_progress_ticks });
    if (rail.stop) return await pauseRunWithReason(db, run, rail.reason ?? "termination rail tripped");

    const ceiling = Number(run.budget_ceiling_usd);

    const { data: items } = await db.from("clean_house_items").select("*").eq("run_id", runId).is("outcome", null);
    const pending = (items ?? []) as ItemRow[];

    // 4) REAL-ledger hard budget stop — the authoritative ceiling.
    const runVideoIds = pending.map((i) => i.video_id);
    const ledgerSpent = await ledgerSpentForRun(db, run, runVideoIds);
    if (cleanHouseLedgerStop(ledgerSpent, ceiling)) {
      return await pauseRunWithReason(db, run, `budget ceiling reached ($${ledgerSpent.toFixed(2)} of $${ceiling.toFixed(2)})`);
    }

    const cfg = await getQualityGateConfig(db);
    const qcFloor = Number(cfg.runFloor ?? 7);
    let spent = Number(run.spent_usd);
    let paidAdvances = 0; // concurrency throttle counter

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
      // A worker-stage asset is in flight — hand to the stall handler (waits,
      // nudges, or flags). A later tick advances it once the worker lands.
      if (gate === undefined) { await handleStall(db, item, v, nowIso); continue; }

      // Per-tick concurrency throttle: cap the paid forward steps a tick fires.
      if (paidAdvances >= CLEAN_HOUSE_MAX_ADVANCES_PER_TICK) continue;

      // Estimate-based pre-check before any paid forward step (belt to the
      // ledger stop's braces — this catches spend the tick hasn't booked yet).
      if (cleanHouseBudgetStop(ledgerSpent + spent - Number(run.spent_usd), ceiling, item.est_cost_usd)) continue;

      // At the FINAL gate, only approve a PASSING cut; a failing one gets a
      // revision (under the cap) or is flagged (at the cap).
      if (v.status === "FINAL_REVIEW" && signals.qcScore != null && signals.qcScore < qcFloor) {
        if (signals.autofixAttempts >= CLEAN_HOUSE_MAX_ROUNDS) {
          await flagUnfixable(db, item.video_id, `QC ${signals.qcScore.toFixed(1)} < floor ${qcFloor} after ${signals.autofixAttempts} rounds.`);
          await db.from("clean_house_items").update({ outcome: "flagged" }).eq("id", item.id);
          continue;
        }
        await decideGate({ videoId: v.id, decision: "revision", notes: "Clean House: QC below floor" }, db, "autopilot");
        await db.from("clean_house_items").update({ inflight_since: nowIso, nudges: 0 }).eq("id", item.id);
        paidAdvances += 1;
        await recordDecision(db, { projectId: v.project_id, videoId: v.id, kind: "regenerate", choice: "revision", reasoning: "Clean House revision (QC below floor)", params: { runId } });
        continue;
      }

      // Approve this gate → advance one step (triggers the next stage's worker).
      await decideGate({ videoId: v.id, decision: "approved", notes: "Clean House" }, db, "autopilot");
      spent = Math.round((spent + item.est_cost_usd) * 100) / 100;
      paidAdvances += 1;
      // The asset now enters the next (worker) stage — (re)start its stall clock.
      await db.from("clean_house_items").update({ spent_usd: item.est_cost_usd, inflight_since: nowIso, nudges: 0 }).eq("id", item.id);
      await recordDecision(db, {
        projectId: v.project_id, videoId: v.id, kind: "regenerate",
        choice: `advance:${v.status}`, reasoning: "Clean House advanced a gate", costUsd: item.est_cost_usd, params: { runId },
      });
    }

    // 5) Progress bookkeeping + rail counters. Progress = an item resolved this
    //    tick OR a paid advance fired; otherwise the no-progress streak grows.
    const { count: resolvedCount } = await db
      .from("clean_house_items")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .not("outcome", "is", null);
    const resolved = resolvedCount ?? 0;
    const progressed = resolved > run.last_progress || paidAdvances > 0;
    await db.from("clean_house_runs").update({
      spent_usd: spent,
      tick_count: run.tick_count + 1,
      no_progress_ticks: progressed ? 0 : run.no_progress_ticks + 1,
      last_progress: resolved,
      locked_at: null, // release the lock
    }).eq("id", runId);

    // 6) Finalize when nothing is left pending.
    const { count: stillPending } = await db
      .from("clean_house_items")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .is("outcome", null);
    if ((stillPending ?? 0) === 0) {
      await db.from("clean_house_runs").update({ status: "done" }).eq("id", runId);
      const { data: outcomes } = await db.from("clean_house_items").select("outcome").eq("run_id", runId);
      const rows = (outcomes ?? []) as { outcome: string | null }[];
      const ready = rows.filter((r) => r.outcome === "ready").length;
      const flagged = rows.filter((r) => r.outcome === "flagged").length;
      await notifyCleanHouse(db, run, `run complete — ${ready} ready to publish, ${flagged} flagged, $${spent.toFixed(2)} spent.`);
      return { ok: true, done: true };
    }
    return { ok: true, done: false };
  } catch (err) {
    // Always release the lock so a failed tick doesn't wedge the run.
    await db.from("clean_house_runs").update({ locked_at: null }).eq("id", runId);
    throw err;
  }
}

/**
 * Cron driver: tick every `running` Clean House run across all projects. Uses
 * the service-role client (RLS bypass) because it runs headless, CRON_SECRET-
 * guarded — not behind a user session. Each run's own atomic lock keeps this
 * safe against a concurrent "Advance now" click.
 */
export async function driveAllCleanHouseRuns(): Promise<{ ticked: number; done: number; paused: number }> {
  const db = createAdminClient() as unknown as Db;
  const { data: runs } = await db.from("clean_house_runs").select("id").eq("status", "running");
  const ids = ((runs ?? []) as { id: string }[]).map((r) => r.id);
  let done = 0;
  let paused = 0;
  for (const id of ids) {
    try {
      const r = await advanceCleanHouseRunWith(db, id);
      if (r.done) done += 1;
      if (r.paused) paused += 1;
    } catch (err) {
      console.error(`clean-house tick failed for ${id}:`, err);
    }
  }
  return { ticked: ids.length, done, paused };
}

/** The active (running/paused/awaiting) run for a project + its item outcomes. */
export async function getActiveCleanHouseRun(projectId: string): Promise<{
  run: { id: string; status: string; est_cost_usd: number; spent_usd: number; budget_ceiling_usd: number; paused_reason: string | null } | null;
  counts: { advance: number; flag: number; skip: number; ready: number; flagged: number; pending: number };
} | null> {
  const db = createAdminClient();
  const { data: run } = await db
    .from("clean_house_runs")
    .select("id, status, est_cost_usd, spent_usd, budget_ceiling_usd, paused_reason")
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
