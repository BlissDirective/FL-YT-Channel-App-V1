import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { startBuildRun, decideGate, isKillSwitchOn, zonedTimeToUtc, ymdInTz, type BuildRunConfig } from "@/lib/pipeline/engine";
import { reviewGate, isQcLive } from "@/lib/adapters/qc";
import { isTelegramLive, sendApprovalCard, sendReviewNeeded, sendDigest, sendTelegram } from "@/lib/adapters/telegram";
import { autofixInFlight } from "@/lib/pipeline/autofix";
import { editorialGuard, planNextTopic, taxonomyFor } from "@/lib/adapters/guardrails";
import {
  analyticsConfigured,
  getChannelSummary,
  getVideoMetrics,
  getYppSnapshot,
} from "@/lib/adapters/youtube-analytics";
import { desiredMixShortsPct, effectiveDailyCap } from "@/lib/pipeline/monetization";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import type { FrameCritique } from "@/lib/stick-types";
import type {
  OperatorConfig,
  OperatorRun,
  OperatorReview,
  OperatorStrategy,
  Project,
  Video,
} from "@/lib/db/types";

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
  publishFloorQc: 6.0,
  rampEnabled: false,
  maxDailyCap: 2,
  taxonomy: [],
  thumbStyle: "cinematic",
  lastDigestAt: "",
  lastAnalyticsAt: "",
  strategy: {},
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
      await logEvent(db, projectId, existing.id, "start", "Resumed");
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
  await logEvent(db, projectId, (data as OperatorRun).id, "start", "Started — 30-day budget cycle begins");
  return { ok: true, run: data as OperatorRun };
}

export async function pauseOperator(db: Db, projectId: string): Promise<{ ok: boolean }> {
  const run = await liveRun(db, projectId);
  if (!run) return { ok: false };
  await db.from("operator_runs").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", run.id);
  await logEvent(db, projectId, run.id, "pause", "Paused (budget clock keeps elapsing)");
  return { ok: true };
}

export async function stopOperator(db: Db, projectId: string): Promise<{ ok: boolean }> {
  const run = await liveRun(db, projectId);
  if (!run) return { ok: false };
  await db.from("operator_runs").update({ status: "stopped", updated_at: new Date().toISOString() }).eq("id", run.id);
  await logEvent(db, projectId, run.id, "stop", "Stopped");
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
    await logEvent(db, run.project_id, run.id, "cycle_roll", `New 30-day cycle — fresh $${Number(run.cycle_budget_usd).toFixed(0)} budget`);
  }
  return run;
}

/** Alert (once per cycle) when the budget is exhausted. */
async function alertBudgetOnce(db: Db, run: OperatorRun, project: Project, spent: number): Promise<void> {
  const { count } = await db
    .from("operator_events")
    .select("id", { count: "exact", head: true })
    .eq("operator_run_id", run.id)
    .eq("kind", "budget")
    .gte("created_at", run.cycle_start);
  if ((count ?? 0) > 0) return;
  const budget = Number(run.cycle_budget_usd).toFixed(0);
  await logEvent(db, run.project_id, run.id, "budget", `Budget exhausted — $${spent.toFixed(2)}/$${budget}. Production paused until the cycle rolls.`);
  if (isTelegramLive()) {
    try {
      await sendTelegram(`💸 <b>${project.name}</b> — monthly budget reached ($${spent.toFixed(2)}/$${budget}). Production pauses until the 30-day cycle resets.`);
    } catch {
      /* best-effort */
    }
  }
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
  // Global emergency stop halts everything (seeding + approvals + publishing).
  if (await isKillSwitchOn(db)) return { acted: false, reason: "kill-switch" };
  // Pull analytics (≤1/day) → strategy, before approvals/digest/seeding so they
  // all see the freshest learning. Approvals + digest run for active AND paused
  // runs (a paused operator still lets you approve + get your digest).
  await maybePullAnalytics(db, run, project);
  await processOperatorApprovals(db, run, project);
  await maybeSendDigest(db, run, project);
  if (run.status !== "active") return { acted: false, reason: run.status };
  // The operator never produces while the channel itself is paused.
  if (project.status !== "active") return { acted: false, reason: "project-paused" };

  const cfg = operatorConfig(run);
  const spent = await cycleSpentUsd(db, run);
  const remaining = Number(run.cycle_budget_usd) - spent;
  if (remaining <= 0) {
    await alertBudgetOnce(db, run, project, spent);
    return { acted: false, reason: "budget-exhausted", spentUsd: spent };
  }

  // Cadence cap: steady cfg.dailyCap, or a maturity-scaled ramp when enabled.
  const ageDays = (Date.now() - new Date(run.cycle_start).getTime()) / 86_400_000;
  const dailyCap = effectiveDailyCap({
    baseCap: cfg.dailyCap,
    maxCap: cfg.maxDailyCap,
    rampEnabled: cfg.rampEnabled,
    ageDays,
    subs: cfg.strategy?.channel?.subs ?? 0,
  });
  if ((await seededTodayCount(db, run, cfg.postingTz)) >= dailyCap) {
    return { acted: false, reason: "already-seeded-today", spentUsd: spent };
  }

  // Choose today's format from the monetization-aware mix (tilts toward the
  // nearer YPP path), and refuse it if its cap won't fit the remaining pool.
  const counts = await cycleFormatCounts(db, run);
  const mixShortsPct = desiredMixShortsPct(cfg.mixShortsPct, cfg.strategy);
  const kind = pickFormat(counts.total, mixShortsPct);
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
    ideaSource: "research", // default; overridden below when the planner succeeds
    scheduleMode: "all_at_once",
    scheduleCfg: {},
  };

  // Guardrail — anti-duplication / topic coverage: plan a fresh, non-overlapping
  // idea that fills a taxonomy gap, and seed with it. Falls back to the built-in
  // research path when the planner is unavailable.
  const { data: recent } = await db
    .from("videos")
    .select("title")
    .eq("project_id", run.project_id)
    .order("created_at", { ascending: false })
    .limit(15);
  const recentTitles = ((recent ?? []) as { title: string }[]).map((r) => r.title).filter(Boolean);
  const taxonomy = taxonomyFor(project, cfg.taxonomy && cfg.taxonomy.length ? cfg.taxonomy : undefined);
  const winners = (cfg.strategy as OperatorStrategy | undefined)?.topSubtopics;
  try {
    const planned = await planNextTopic({ project, recentTitles, taxonomy, kind, winners });
    if (planned) {
      const { data: idea } = await db
        .from("ideas")
        .insert({
          project_id: run.project_id,
          title: planned.title,
          angle: planned.angle,
          status: "approved",
          source: { operator: true, subtopic: planned.subtopic },
        })
        .select("id")
        .single();
      if (idea) {
        buildCfg.ideaSource = "existing";
        buildCfg.ideaIds = [idea.id as string];
      }
      if (planned.costUsd > 0) {
        await db.from("cost_ledger").insert({
          project_id: run.project_id,
          video_id: null,
          provider: "anthropic",
          description: `Operator topic plan — ${planned.subtopic || "topic"}`,
          usd: planned.costUsd,
        });
      }
    }
  } catch (err) {
    console.error("operator topic planning failed (falling back to research):", err);
  }

  const res = await startBuildRun(run.project_id, buildCfg, db);
  if (!res.ok) return { acted: false, reason: res.error };

  // Claim the seeded video for the operator and stamp the day's publish slot.
  // It holds at FINAL_REVIEW for approval (the finalizer defers operator videos).
  const slot = nextSlotUtc(new Date(), cfg.postingHour, cfg.postingTz);
  await db
    .from("videos")
    .update({ operator_run_id: run.id, scheduled_publish_at: slot.toISOString() })
    .eq("build_run_id", res.runId);

  const { data: seeded } = await db.from("videos").select("title").eq("build_run_id", res.runId).limit(1).maybeSingle();
  await logEvent(db, run.project_id, run.id, "seed", `Seeded ${kind}: ${(seeded?.title as string) ?? "(untitled)"}`);
  return { acted: true, kind };
}

// ── Approvals (Telegram notify → approve/skip / auto-approve) ─────────

/** Append an activity-log entry (best-effort — never throws). */
async function logEvent(
  db: Db,
  projectId: string,
  runId: string | null,
  kind: string,
  message: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.from("operator_events").insert({ project_id: projectId, operator_run_id: runId, kind, message, meta });
  } catch {
    /* logging must never break the loop */
  }
}

async function recordCost(db: Db, video: Video, usd: number, description: string) {
  if (usd <= 0) return;
  await db.from("cost_ledger").insert({
    project_id: video.project_id,
    video_id: video.id,
    provider: "anthropic",
    description,
    usd,
  });
  await db.from("videos").update({ total_cost_usd: Number(video.total_cost_usd) + usd }).eq("id", video.id);
}

/** FINAL quality for the approval bar: prefer the auto-fix loop's vision score;
    otherwise score the final cut with the QC agent. */
async function finalQc(db: Db, video: Video, project: Project): Promise<number> {
  const vr = video.vision_review as FrameCritique | null;
  if (vr && typeof vr.score === "number") return Number(vr.score);
  if (!isQcLive()) return 7;
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const review = await reviewGate({
    gate: "FINAL",
    context: {
      title: video.title,
      topic: video.topic,
      niche: project.niche,
      captionsOn: video.enable_captions,
      targetLengthSec: video.target_length_sec,
      beats: ((script?.beats ?? []) as unknown[]).length,
    },
  });
  if (review.costUsd > 0) await recordCost(db, video, review.costUsd, "Operator final QC");
  return review.score;
}

/** Approve an operator video → it publishes at its slot. Privacy from QC. */
export async function approveOperatorVideo(db: Db, video: Video, by: string): Promise<void> {
  const rev = (video.operator_review ?? {}) as OperatorReview;
  const qc = Number(rev.qc ?? 8);
  const privacy = qc >= 8 ? "public" : "unlisted";
  await db
    .from("videos")
    .update({
      auto_publish: true,
      publish_privacy: privacy,
      operator_review: { ...rev, decided: "approved", by },
    })
    .eq("id", video.id);
  // Move FINAL_REVIEW → APPROVED (already-APPROVED in-app videos are a no-op).
  if (video.status === "FINAL_REVIEW") {
    await decideGate({ videoId: video.id, decision: "approved" }, db, by === "auto" ? "autopilot" : "mcp");
  }
  await logEvent(
    db,
    video.project_id,
    video.operator_run_id,
    by === "auto" ? "auto_approve" : "approve",
    `${by === "auto" ? "Auto-approved" : "Approved"} (${privacy}): ${video.title}`,
    { by },
  );
}

/** Skip an operator video → it is killed and won't post; the next slot reseeds. */
export async function skipOperatorVideo(db: Db, video: Video, by: string): Promise<void> {
  const rev = (video.operator_review ?? {}) as OperatorReview;
  await db.from("videos").update({ operator_review: { ...rev, decided: "skipped", by } }).eq("id", video.id);
  await decideGate({ videoId: video.id, decision: "killed" }, db, by === "auto" ? "autopilot" : "mcp");
  await logEvent(db, video.project_id, video.operator_run_id, "skip", `Skipped: ${video.title}`, { by });
}

/** Load a video + its project for a webhook callback (by video id). */
export async function loadOperatorVideo(
  db: Db,
  videoId: string,
): Promise<{ video: Video; project: Project } | null> {
  const { data: v } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
  const video = v as Video | null;
  if (!video) return null;
  const { data: p } = await db.from("projects").select("*").eq("id", video.project_id).maybeSingle();
  const project = p as Project | null;
  if (!project) return null;
  return { video, project };
}

/**
 * Notify on (and auto-approve) operator videos. Only runs when Telegram is live;
 * without it, operator videos simply hold in the in-app review queue (Phase A).
 *  • settled at FINAL_REVIEW, not yet notified → QC it, send the approval card.
 *  • notified, aged past autoApproveHours, QC ≥ autoApproveQc → auto-approve.
 *  • manually APPROVED in-app (no decision recorded) → finalize for release.
 */
async function processOperatorApprovals(db: Db, run: OperatorRun, project: Project): Promise<void> {
  if (!isTelegramLive()) return;
  const cfg = operatorConfig(run);

  // 1) Settle + notify + auto-approve videos still at FINAL_REVIEW.
  const { data: holding } = await db
    .from("videos")
    .select("*")
    .eq("operator_run_id", run.id)
    .eq("status", "FINAL_REVIEW")
    .eq("auto_publish", false);
  for (const video of ((holding ?? []) as Video[])) {
    const rev = (video.operator_review ?? {}) as OperatorReview;
    if (rev.decided || rev.hold) continue; // decided, or already held for review
    if (autofixInFlight(video)) continue; // let the fix loop settle first
    if (!rev.notifiedAt) {
      const qc = await finalQc(db, video, project);

      // Guardrail — pre-publish editorial review of the finished script + metadata.
      const { data: script } = await db
        .from("scripts")
        .select("body, metadata")
        .eq("video_id", video.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tags = ((script?.metadata ?? {}) as { tags?: string[] }).tags ?? [];
      const guard = await editorialGuard({
        title: video.title,
        scriptBody: (script?.body as string) ?? "",
        tags,
        niche: project.niche,
      });
      if (guard.costUsd > 0) await recordCost(db, video, guard.costUsd, "Operator editorial guard");
      const flags = [...guard.legalFlags, ...guard.factIssues, ...guard.metadataIssues];

      // Quality floor or a hard editorial fail → hold for manual review (no
      // one-tap approval; never auto-approved).
      if (qc < cfg.publishFloorQc || guard.verdict === "fail") {
        const reason =
          guard.verdict === "fail"
            ? `editorial review: ${guard.note || flags[0] || "flagged"}`
            : `QC ${qc.toFixed(1)} below the ${cfg.publishFloorQc.toFixed(1)} floor`;
        await db
          .from("videos")
          .update({
            paused_reason: `Auto Pilot held — ${reason}. Manual review.`,
            operator_review: { ...rev, notifiedAt: new Date().toISOString(), qc, hold: true, holdReason: reason },
          })
          .eq("id", video.id);
        try {
          await sendReviewNeeded({ projectId: project.id, videoId: video.id, title: video.title, reason, flags });
        } catch (err) {
          console.error("telegram review-needed failed:", err);
        }
        await logEvent(db, project.id, run.id, "hold", `Held: ${video.title} — ${reason}`, { flags });
        continue;
      }

      // Pass or caution → offer approval. Caution still surfaces flags and
      // requires a manual tap (no auto-approve).
      const noAuto = guard.verdict === "caution";
      await db
        .from("videos")
        .update({
          operator_review: { ...rev, notifiedAt: new Date().toISOString(), qc, caution: noAuto ? flags : undefined, noAuto },
        })
        .eq("id", video.id);
      try {
        await sendApprovalCard({
          projectId: project.id,
          videoId: video.id,
          title: video.title,
          kind: video.kind,
          qc,
          slot: video.scheduled_publish_at,
          caution: noAuto ? flags : undefined,
        });
      } catch (err) {
        console.error("telegram approval card failed:", err);
      }
      await logEvent(db, project.id, run.id, "notify", `Awaiting approval: ${video.title} (QC ${qc.toFixed(1)})`, { noAuto });
    } else {
      const ageMs = Date.now() - new Date(rev.notifiedAt).getTime();
      if (
        !rev.noAuto &&
        ageMs >= cfg.autoApproveHours * 3_600_000 &&
        Number(rev.qc ?? 0) >= cfg.autoApproveQc
      ) {
        await approveOperatorVideo(db, video, "auto");
      }
    }
  }

  // 2) Safety net: an operator video approved in-app (review queue) lands at
  //    APPROVED with auto_publish=false — finalize it so the scheduler releases it.
  const { data: approved } = await db
    .from("videos")
    .select("*")
    .eq("operator_run_id", run.id)
    .eq("status", "APPROVED")
    .eq("auto_publish", false)
    .is("youtube_video_id", null);
  for (const video of ((approved ?? []) as Video[])) {
    const rev = (video.operator_review ?? {}) as OperatorReview;
    if (rev.decided) continue;
    await approveOperatorVideo(db, video, "app");
  }
}

// ── Metrics → strategy (Phase D) ──────────────────────────────────────

/** Pull the channel's real analytics at most once/day and recompute the learned
    performance strategy (best subtopics + per-format performance + YPP rollups),
    stored on the run config for the planner, the mix tilt, and the digest. */
async function maybePullAnalytics(db: Db, run: OperatorRun, project: Project): Promise<void> {
  const refreshToken = project.youtube_refresh_token ?? null;
  if (!analyticsConfigured(refreshToken)) return;
  const lastIso = (run.config as { lastAnalyticsAt?: string }).lastAnalyticsAt;
  const last = lastIso ? new Date(lastIso).getTime() : 0;
  if (Date.now() - last < 22 * 3_600_000) return; // ~daily

  try {
    const strategy = await computeChannelStrategy(db, run, project, refreshToken);
    await db
      .from("operator_runs")
      .update({
        config: { ...(run.config ?? {}), strategy, lastAnalyticsAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    run.config = { ...(run.config ?? {}), strategy, lastAnalyticsAt: new Date().toISOString() };
    await logEvent(
      db,
      run.project_id,
      run.id,
      "analytics",
      `Pulled analytics — ${strategy.channel?.subs ?? 0} subs · ${(strategy.channel?.watchHours365 ?? 0).toFixed(0)}h watched`,
    );
  } catch (err) {
    console.error(`operator analytics pull ${run.id} failed:`, err);
  }
}

async function computeChannelStrategy(
  db: Db,
  run: OperatorRun,
  project: Project,
  refreshToken: string | null,
): Promise<OperatorStrategy> {
  // The operator's published videos + the subtopic each was planned under.
  const { data: vids } = await db
    .from("videos")
    .select("id, idea_id, kind, youtube_video_id")
    .eq("operator_run_id", run.id)
    .not("youtube_video_id", "is", null)
    .limit(200);
  const rows = (vids ?? []) as { id: string; idea_id: string | null; kind: string; youtube_video_id: string }[];

  const ideaIds = rows.map((r) => r.idea_id).filter((x): x is string => Boolean(x));
  const subtopicByIdea = new Map<string, string>();
  if (ideaIds.length) {
    const { data: ideas } = await db.from("ideas").select("id, source").in("id", ideaIds);
    for (const i of ((ideas ?? []) as { id: string; source: { subtopic?: string } | null }[])) {
      const st = i.source?.subtopic;
      if (st) subtopicByIdea.set(i.id, st);
    }
  }

  const metrics = await getVideoMetrics(refreshToken, rows.map((r) => r.youtube_video_id), 90);

  // Aggregate by subtopic (retention × reach) and by format (watch + subs).
  const bySub = new Map<string, { views: number; watch: number; retW: number }>();
  const fmt = {
    short: { watchMin: 0, subs: 0, views: 0, n: 0 },
    long: { watchMin: 0, subs: 0, views: 0, n: 0 },
  };
  for (const r of rows) {
    const m = metrics.get(r.youtube_video_id);
    if (!m) continue;
    const st = (r.idea_id && subtopicByIdea.get(r.idea_id)) || "uncategorized";
    const agg = bySub.get(st) ?? { views: 0, watch: 0, retW: 0 };
    agg.views += m.views;
    agg.watch += m.watchMinutes;
    agg.retW += m.retentionPct * Math.max(1, m.views); // view-weighted retention
    bySub.set(st, agg);
    const f = r.kind === "short" ? fmt.short : fmt.long;
    f.watchMin += m.watchMinutes;
    f.subs += m.subscribersGained;
    f.views += m.views;
    f.n += 1;
  }

  const topSubtopics = [...bySub.entries()]
    .map(([st, a]) => ({ st, score: (a.views > 0 ? a.retW / a.views : 0) * Math.log(a.views + 2) }))
    .filter((x) => x.st !== "uncategorized")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.st);

  const [summary, ypp] = await Promise.all([
    getChannelSummary(refreshToken, 90),
    getYppSnapshot(refreshToken),
  ]);

  return {
    topSubtopics,
    formatPerf: fmt,
    channel: {
      subs: ypp?.subscriberCount ?? 0,
      watchHours365: ypp?.watchHours365 ?? 0,
      views90: summary?.views ?? 0,
      subsGained90: summary?.subscribersGained ?? 0,
      retentionPct: summary?.retentionPct ?? 0,
      ctr: summary?.ctr ?? 0,
      shortsViews90: fmt.short.views,
    },
    updatedAt: new Date().toISOString(),
  };
}

// ── Weekly digest ─────────────────────────────────────────────────────

async function maybeSendDigest(db: Db, run: OperatorRun, project: Project): Promise<void> {
  if (!isTelegramLive()) return;
  const cfg = run.config ?? {};
  const lastIso = (cfg as { lastDigestAt?: string }).lastDigestAt;
  const last = lastIso ? new Date(lastIso).getTime() : 0;
  const now = Date.now();
  // Mondays ~9am CT, at most once every 6 days.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(now));
  const wd = parts.find((p) => p.type === "weekday")?.value;
  const hr = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const due = wd === "Mon" && hr >= 9 && now - last >= 6 * 86_400_000;
  if (!due) return;

  const snap = await operatorSnapshot(db, run);
  const [{ count: posted }, { count: awaiting }] = await Promise.all([
    db.from("videos").select("id", { count: "exact", head: true })
      .eq("operator_run_id", run.id).not("youtube_video_id", "is", null),
    db.from("videos").select("id", { count: "exact", head: true })
      .eq("operator_run_id", run.id).eq("status", "FINAL_REVIEW").eq("auto_publish", false),
  ]);
  const strat = (run.config as { strategy?: OperatorStrategy }).strategy;
  const ch = strat?.channel;
  try {
    await sendDigest({
      projectName: project.name,
      cycleDay: snap.cycleDay,
      posted: posted ?? 0,
      spentUsd: snap.spentUsd,
      budgetUsd: snap.budgetUsd,
      awaiting: awaiting ?? 0,
      subs: ch?.subs,
      watchHours365: ch?.watchHours365,
      retentionPct: ch?.retentionPct,
      topSubtopics: strat?.topSubtopics,
    });
    await db
      .from("operator_runs")
      .update({ config: { ...(run.config ?? {}), lastDigestAt: new Date().toISOString() } })
      .eq("id", run.id);
    await logEvent(db, run.project_id, run.id, "digest", "Sent weekly digest");
  } catch (err) {
    console.error("telegram digest failed:", err);
  }
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
