import "server-only";
import {
  buildVisualPrompt,
  checkPublicHttpUrl,
  GATE_FOR_STATUS,
  GATE_LABELS,
  isDirectorMode,
  ON_APPROVE,
  PREVIOUS_STAGE,
  REVISION_TARGET,
  type ApprovalGate,
  type AutonomyMode,
  type VideoStatus,
} from "@studio/core";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push";
import { isTelegramLive, sendTelegram } from "@/lib/adapters/telegram";
import {
  generateScript,
  remixScript,
  remixBeat,
  classifyShotTypes,
  type RemixSettings,
  type ScriptRemix,
  type BeatRemix,
} from "@/lib/adapters/script";
import { curateHighlights, defaultHighlightCount } from "@/lib/adapters/highlights";
import type { CuratedHighlight } from "@/lib/db/types";
import { COPILOT_AUTO_APPROVE_SCORE, isQcLive, reviewGate } from "@/lib/adapters/qc";
import { finalGateScore } from "@/lib/pipeline/rubrics";
import { editorialGuard } from "@/lib/adapters/guardrails";
import { factCheckScript, isFactCheckLive } from "@/lib/adapters/fact-check";
import { pickBestVariant } from "@/lib/adapters/variant-judge";
import { verifyBeatVisual, isBeatRelevanceLive, type BeatRelevance } from "@/lib/adapters/beat-relevance";
import { playbookForStage } from "@/lib/pipeline/playbook";
import { getQualityGateConfig, failClosedBlocksSpend, privacyForScore, type QualityGateConfig } from "@/lib/pipeline/quality-gates";
import { getVceFlags } from "@/lib/pipeline/vce";
import { getScriptExemplars } from "@/lib/pipeline/exemplars";
import {
  DEFAULT_AVATAR_MODEL_ID,
  SYNC_USD_PER_SEC,
  estimateAvatarCost,
  generateAvatarVideo,
  getAvatarModel,
  isSyncLive,
  resyncLipsync,
} from "@/lib/adapters/avatar";
import { buildVisualBible } from "@/lib/adapters/visual-bible";
import { planShots, mockBeatIntents } from "@/lib/adapters/shot-planner";
import { nextPrompt } from "@/lib/pipeline/beat-refine";
import { findReference } from "@/lib/adapters/visual-grounding";
import { mediumToShotType, wantsGrounding } from "@studio/core";
import { autofixSettled, resolveWatchVerdict, watchBlocksPublish, watchHoldReason } from "@/lib/pipeline/settle";
import { recordCost, monthSpend, checkBudget } from "@/lib/pipeline/ledger";
import { keywords } from "@/lib/pipeline/dedup";
import { providerOutage } from "@/lib/pipeline/provider-health";
import { canSynthesize, synthesizeSpeech, voiceProviderFor } from "@/lib/adapters/voice";
import {
  buildScriptLexicon,
  remapWordTimings,
  toSpokenText,
  type Lexicon,
} from "@/lib/adapters/pronunciation";
import { generateImage, generateVideo, isFalLive, FalVideoTimeoutError } from "@/lib/adapters/fal";
import {
  clampDuration,
  estimateClipCost,
  getVideoModel,
  VIDEO_MONTHLY_CAP_USD,
  VIDEO_PROVIDER,
} from "@/lib/adapters/video-models";
import { estimateTierCost, selectClipBeats, type AutoTier } from "@/lib/adapters/auto-tiers";
import {
  selectBeatModel,
  videoModelHealth,
  type ModelHealth,
} from "@/lib/adapters/provider-selector";
import { recordDecision, recordDecisions } from "@/lib/pipeline/decisions";
import { choreographStickScenes } from "@/lib/adapters/stick-choreographer";
import { directShots, assessVisualPrompt, assessPromptRelevance, refineOneShot, isArtDirectorLive } from "@/lib/adapters/art-director";
import { inspectStill, perceptualHash, hammingDistance } from "@/lib/adapters/image-check";
import { critiqueSeedStill, isSeedVisionLive } from "@/lib/adapters/seed-vision";
import type { StickScene } from "@/lib/stick-types";
import { searchStockClip, searchStockPhotos } from "@/lib/adapters/stock";
import { planVerifiedCharts, type ChartSpec as DataVizChart } from "@/lib/adapters/dataviz";
import { classifyLicense, type SourceCandidate } from "@/lib/adapters/sources";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import type { BuildRunStatus, CustomSpec, Project, ScriptBeat, Video } from "@/lib/db/types";
import { SHORT_LENGTHS } from "@/lib/db/types";
import { runIntelligence } from "./intelligence";
import { MOCK_COSTS } from "./mock-content";
import { DEFAULT_SCRIPT_TEMPLATE } from "./templates";

/**
 * Phase 3 orchestration backbone — a DB-driven engine with the same
 * waitpoint semantics the plan assigns to Trigger.dev: each stage runs,
 * lands the video on a review gate, and stops until a decision resolves
 * the waitpoint (a human in Assist mode, the engine itself in Autopilot).
 * Mock stages complete in seconds, so serverless execution suffices;
 * Phase 4 moves stage bodies onto Trigger.dev tasks behind this same
 * interface (see docs/DECISIONS.md).
 */

export type Db = Awaited<ReturnType<typeof createClient>>;

export type EngineResult = { ok: boolean; error?: string; warning?: string };

/** Tier 3 — cost-aware human-revision cap (hybrid): warn from this revision on,
    hard-block at the cap. Auto-pilot's single revision is exempt (it's its own
    one-shot limit and uses decided_by 'autopilot'). */
// Revision warn/cap thresholds live in quality-gates config (Settings-tunable).

const STAGE_DELAY_MS = 700; // lets Realtime dashboards show in-progress states

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Turn a raw provider error (often a wall of JSON) into a short, actionable
 * hold reason for the Library tile / Canvas. Known operational failures get a
 * plain-English fix; anything else is truncated so the card stays readable.
 */
export function humanizeProviderError(raw: string): string {
  const s = raw ?? "";
  if (/credit balance is too low|Plans & Billing|insufficient.*credit|billing/i.test(s)) {
    return "Anthropic API is out of credits — add credits in the Anthropic console (Plans & Billing), then press Resume.";
  }
  if (/\b(401|invalid[_\s-]?api[_\s-]?key|authentication|unauthorized)\b/i.test(s)) {
    return "Anthropic API key rejected (401) — check ANTHROPIC_API_KEY in Settings, then Resume.";
  }
  if (/\b(429|rate[_\s-]?limit)\b/i.test(s)) {
    return "Anthropic API rate limit hit — wait a minute, then press Resume.";
  }
  if (/\b(500|502|503|529|overloaded|Internal Server Error)\b/i.test(s)) {
    return "Anthropic API is temporarily unavailable — press Resume in a minute.";
  }
  // Strip embedded JSON braces so a raw SDK error reads cleanly, then cap.
  const clean = s.replace(/\{.*$/s, "").replace(/\s+/g, " ").trim() || s.trim();
  return clean.slice(0, 180);
}

async function getVideo(db: Db, id: string): Promise<Video | null> {
  const { data } = await db.from("videos").select("*").eq("id", id).maybeSingle();
  return (data as Video) ?? null;
}

async function getProject(db: Db, id: string): Promise<Project | null> {
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

/** Ids of every Director-Mode project — the belt-and-suspenders exclusion set
    for sweeps that select videos without loading each project. Cheap: the
    partial index `projects_pipeline_mode_idx` covers this exact predicate. */
export async function directorProjectIds(db: Db): Promise<Set<string>> {
  const { data } = await db
    .from("projects")
    .select("id")
    .eq("pipeline_mode", "director");
  return new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
}

export async function isKillSwitchOn(db?: Db): Promise<boolean> {
  const supabase = db ?? (await createClient());
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean })?.enabled);
}

async function setStatus(db: Db, videoId: string, status: VideoStatus) {
  await db.from("videos").update({ status }).eq("id", videoId);
}

/**
 * Trust-the-chat status (ClickMax de-clutter): pipeline events — gate
 * arrivals, QC verdicts, holds, pauses — post into the workspace thread as
 * agent messages instead of living as persistent banner chrome. Best-effort:
 * a missing table must never block the pipeline.
 */
async function postWorkspaceNote(
  db: Db,
  video: Pick<Video, "id" | "project_id">,
  content: string,
  intent?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from("workspace_messages").insert({
      project_id: video.project_id,
      video_id: video.id,
      role: "agent",
      content,
      intent: intent ?? null,
    });
  } catch (err) {
    console.error("workspace note failed (non-blocking):", err);
  }
}

/** Budget guard — runs before every paid stage (standing rule 6). Returns
    a pause reason when a cap would be exceeded, null when clear. Thin wrapper
    over the shared ledger checkBudget (Phase 2: one budget system). */
async function budgetPause(
  db: Db,
  video: Video,
  project: Project,
): Promise<string | null> {
  const outage = await providerOutage(db, "fal");
  if (outage.down && isFalLive()) {
    return `fal is paused (${outage.reason.slice(0, 120)}) — fix the account, then Test in Settings`;
  }
  const check = await checkBudget(db, project, video);
  return check.ok ? null : check.reason;
}

/** Gather what the QC agent needs to judge a gate arrival. */
async function qcContext(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
): Promise<Record<string, unknown>> {
  const base = {
    title: video.title,
    topic: video.topic,
    format: video.format,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    targetLengthSec: video.target_length_sec,
  };
  if (gate === "IDEA") return base;
  const { data: script } = await db
    .from("scripts")
    .select("beats, runtime_sec, metadata")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (gate === "SCRIPT") return { ...base, script };
  const { data: assets } = await db
    .from("assets")
    .select("kind, provider, beat_index, meta, cost_usd")
    .eq("video_id", video.id);
  const summary = (assets ?? []).map((a) => ({
    kind: a.kind,
    provider: a.provider,
    beat: a.beat_index,
    shotType: (a.meta as { shotType?: string }).shotType,
    durationSec: (a.meta as { durationSec?: number }).durationSec,
  }));
  return { ...base, beatsInScript: (script?.beats as unknown[])?.length, assets: summary };
}

/** A video arrived at a review gate: notify, then either wait for a human
    (Assist / Co-pilot until the Phase 8 QC agent exists) or auto-resolve
    the waitpoint (Autopilot). */
async function arriveAtGate(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
): Promise<void> {
  // QC agent reviews every arrival; failures degrade to a neutral verdict
  // and never block the gate.
  // Director Mode: gates never auto-advance — force 'assist' so the arrival
  // lands and holds for the operator, while the QC review below still runs and
  // records an ADVISORY score. No auto-approve, no fact-check/watch holds fire.
  const mode: AutonomyMode = isDirectorMode(project)
    ? "assist"
    : project.autonomy?.[gate] ?? "assist";
  // C2 — the CUT gate (ASSETS slot with an active EDD) auto-approves at the
  // per-project cut floor (default 7.0), not the app-wide 7.5.
  const isCutGate = gate === "ASSETS" && video.edit_document_version != null;
  const autoApproveFloor = isCutGate
    ? Number(project.cut_copilot_floor ?? 7.0)
    : COPILOT_AUTO_APPROVE_SCORE;
  let qcScore: number | null = null;
  let qcErrored = false;
  let qcIssues: string[] = [];
  try {
    const review = await reviewGate({
      gate,
      context: await qcContext(db, video, project, gate),
      // Borderline results near the auto-approve bar re-judge on the strong
      // model when this review can gate an automatic advance (C1 cascade).
      escalateNear: mode === "assist" ? undefined : autoApproveFloor,
    });
    qcScore = review.score;
    qcIssues = review.issues ?? [];
    if (review.degraded) qcErrored = true; // live-but-failed → hold below, never a fake 6/10
    const autoApprove = mode === "copilot" && !review.degraded && review.score >= autoApproveFloor;
    await db.from("qc_reviews").insert({
      video_id: video.id,
      gate,
      // A degraded review is NOT a measurement — record null, never the neutral
      // placeholder 6.0 (which the library would surface as a real QC score).
      score: review.degraded ? null : review.score,
      verdict: review.verdict,
      issues: review.issues,
      strengths: review.strengths,
      criteria: review.criteria,
      judge_model: review.judgeModel,
      escalated: review.escalated,
      auto_approved: autoApprove,
    });
    if (review.costUsd > 0) {
      await recordCost(
        db,
        video,
        { provider: "anthropic", usd: review.costUsd, description: "QC review" },
        `${GATE_LABELS[gate]} gate`,
      );
    }
  } catch (err) {
    qcErrored = true;
    console.error("QC review failed:", err);
  }

  // Notification channels are independently toggleable per project
  // (ClickMax transition decision 6; projects.notify_prefs, default both on).
  const notify = (project.notify_prefs ?? {}) as { telegram?: boolean; webpush?: boolean };
  if (notify.webpush !== false) {
    try {
      await sendPushToAll({
        title: `${GATE_LABELS[gate]} ready for review`,
        body: `“${video.title}” — ${project.name}${qcScore != null ? ` · QC ${qcScore.toFixed(1)}/10` : ""}`,
        url: `/projects/${project.id}/review`,
      });
    } catch (err) {
      // Push is best-effort — never let delivery problems block the pipeline.
      console.error("web-push delivery failed:", err);
    }
  }
  if (notify.telegram !== false && isTelegramLive()) {
    try {
      await sendTelegram(
        `🎬 <b>${GATE_LABELS[gate]}</b> ready — “${video.title}” (${project.name})` +
          (qcScore != null ? ` · QC ${qcScore.toFixed(1)}/10` : ""),
      );
    } catch (err) {
      console.error("telegram delivery failed:", err);
    }
  }

  const copilotApproved = mode === "copilot" && qcScore != null && qcScore >= autoApproveFloor;
  // Trust-the-chat: the gate outcome lands in the workspace thread (§decision
  // "banners become messages"), whichever branch runs below.
  const qcLine =
    qcScore != null
      ? ` QC scored it ${qcScore.toFixed(1)}/10${qcIssues.length > 0 ? ` — flagged: ${qcIssues.slice(0, 2).join("; ")}` : ""}.`
      : "";
  // Full Auto owns advancement past the Assets gate (it pauses here so the
  // generated clips can replace the stills before the render runs).
  if (gate === "ASSETS" && video.auto_finish) return;
  if (mode !== "autopilot" && !copilotApproved) {
    await postWorkspaceNote(
      db,
      video,
      `${GATE_LABELS[gate]} is ready for your review.${qcLine} Say “continue” to approve, or tell me what to change.`,
      { event: "gate_hold", gate, qcScore },
    );
    return;
  }

  // Phase 4.4 — "grader down" must not mean "publish anyway": when the QC
  // review errored and this gate would auto-advance, hold for a human instead.
  // Advisory mode (Step 1): the grade was advisory anyway — note and continue;
  // the human is the grader of record.
  if (qcErrored && isQcLive()) {
    const qgAdv = await getQualityGateConfig(db);
    if (qgAdv.advisory) {
      await postWorkspaceNote(
        db,
        video,
        `QC was unavailable at ${GATE_LABELS[gate]} — continuing without a score (advisory mode). Give this one your own look.`,
        { event: "advisory_qc_down", gate },
      );
    } else {
      await db
        .from("videos")
        .update({ paused_reason: "QC unavailable — held for manual review (auto-advance blocked)" })
        .eq("id", video.id);
      await postWorkspaceNote(
        db,
        video,
        `I held “${video.title}” at ${GATE_LABELS[gate]} — the QC reviewer was unavailable, so I won't auto-advance blind. Review it, or try again shortly.`,
        { event: "gate_held_qc_down", gate },
      );
      return;
    }
  }

  // Phase 4.2 — prose fact-check gate: before an auto-advance past SCRIPT,
  // verify the script's load-bearing claims; high risk holds the video.
  if (gate === "SCRIPT") {
    const held = await factCheckAtScriptGate(db, video, project);
    if (held) {
      await postWorkspaceNote(
        db,
        video,
        `I held the script — the fact-check flagged load-bearing claims that need a look before continuing.`,
        { event: "gate_held_factcheck", gate },
      );
      return;
    }
  }

  await postWorkspaceNote(
    db,
    video,
    `${GATE_LABELS[gate]} approved automatically.${qcLine} Continuing.`,
    { event: "gate_auto_approved", gate, qcScore },
  );
  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: "approved",
    decided_by: mode === "autopilot" ? "autopilot" : "qc-agent",
    decided_at: new Date().toISOString(),
  });
  const current = (await getVideo(db, video.id))!;
  const next = ON_APPROVE[current.status];
  if (next) {
    await setStatus(db, video.id, next);
    // Thread the same client — a fresh createClient() runs unauthenticated
    // under the service role (MCP/cron/autopilot), which RLS blocks → stall.
    await runPipeline(video.id, db);
  }
}

/** Director stage → the ApprovalGate whose rubric reviewGate should apply. */
const GATE_FOR_DIRECTOR_STAGE: Record<
  "idea" | "script" | "visuals" | "edit" | "publish",
  ApprovalGate
> = { idea: "IDEA", script: "SCRIPT", visuals: "ASSETS", edit: "FINAL", publish: "FINAL" };

export type StageReviewResult = {
  ok: boolean;
  error?: string;
  score: number | null;
  verdict: "pass" | "fail" | null;
  degraded: boolean;
  costUsd: number;
};

/**
 * Director Mode advisory review (spec §5 "Review action"). Runs the QC judge
 * for the video's current stage, stores the result on `qc_reviews` exactly like
 * an autonomous gate arrival — but it is purely advisory: the caller records
 * the score and NOTHING advances or holds on it. The verdict is computed
 * against the stage's floor only to annotate pass/fail; it never gates.
 *
 * Director-only. Best-effort cost accounting (the judge call is ledgered).
 */
export async function runStageReview(
  videoId: string,
  dbArg?: Db,
): Promise<StageReviewResult> {
  const db = dbArg ?? (await createClient());
  const base: StageReviewResult = { ok: false, score: null, verdict: null, degraded: false, costUsd: 0 };
  const video = await getVideo(db, videoId);
  if (!video) return { ...base, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ...base, error: "Project not found" };
  if (!isDirectorMode(project)) return { ...base, error: "runStageReview is Director-Mode only" };

  const stage = ((): "idea" | "script" | "visuals" | "edit" | "publish" => {
    const s = video.status;
    if (s === "IDEA" || s === "IDEA_APPROVED") return "idea";
    if (s === "SCRIPTING" || s === "SCRIPT_READY") return "script";
    if (s === "GENERATING_ASSETS" || s === "ASSETS_READY") return "visuals";
    if (s === "ASSEMBLING" || s === "FINAL_REVIEW") return "edit";
    return "publish";
  })();
  const gate = GATE_FOR_DIRECTOR_STAGE[stage];

  try {
    const review = await reviewGate({
      gate,
      context: await qcContext(db, video, project, gate),
      // Advisory only — no escalateNear, since no auto-advance decision rides on it.
    });
    await db.from("qc_reviews").insert({
      video_id: video.id,
      gate,
      score: review.score,
      verdict: review.verdict,
      issues: review.issues,
      strengths: review.strengths,
      criteria: review.criteria,
      judge_model: review.judgeModel,
      escalated: review.escalated,
      auto_approved: false, // Director never auto-approves off a review
    });
    if (review.costUsd > 0) {
      await recordCost(
        db,
        video,
        { provider: "anthropic", usd: review.costUsd, description: "QC review" },
        `${GATE_LABELS[gate]} review (Director)`,
      );
    }
    // Advisory verdict against the idea/run floor purely to annotate the badge.
    const qg = await getQualityGateConfig(db);
    const floor = gate === "IDEA" ? qg.ideaFloor : qg.runFloor;
    const verdict: "pass" | "fail" = review.score >= floor ? "pass" : "fail";
    return {
      ok: true,
      score: review.score,
      verdict,
      degraded: Boolean(review.degraded),
      costUsd: review.costUsd ?? 0,
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run the prose fact-check for a script about to auto-advance. Stores the
 * verdict on the video, ledgers the cost, and pauses the video (returns true)
 * when risk >= quality_gates.factRiskMax. Best-effort: adapter outages
 * fail open with an "unavailable" marker rather than holding every script.
 */
async function factCheckAtScriptGate(db: Db, video: Video, project: Project): Promise<boolean> {
  if (!isFactCheckLive()) return false;
  try {
    const script = await loadLatestScript(db, video.id);
    const beats = ((script?.beats ?? []) as ScriptBeat[]).map((b) => ({ idx: b.idx, text: b.text }));
    if (beats.length === 0) return false;
    const fc = await factCheckScript({ title: video.title, niche: project.niche, beats });
    await db
      .from("videos")
      .update({ fact_check: { risk: fc.risk, claims: fc.claims, searched: fc.searched, at: new Date().toISOString() } })
      .eq("id", video.id);
    if (fc.costUsd > 0) {
      await recordCost(db, video, { provider: "anthropic", usd: fc.costUsd, description: "Script fact-check" });
    }
    const { factRiskMax, advisory } = await getQualityGateConfig(db);
    if (fc.risk >= factRiskMax) {
      const worst = fc.claims.filter((c) => c.verdict === "false").slice(0, 2);
      const detail = worst.length ? ` — ${worst.map((c) => c.claim).join("; ").slice(0, 140)}` : "";
      if (advisory) {
        // Step 1 advisory mode: flag the risky claims in the thread and keep
        // moving — the human judges whether they matter.
        await postWorkspaceNote(
          db,
          video,
          `Fact-check flagged risk ${fc.risk}/10${detail}. Continuing — double-check those claims before publishing.`,
          { event: "advisory_factcheck", risk: fc.risk },
        );
        return false;
      }
      await db
        .from("videos")
        .update({ paused_reason: `Fact-check risk ${fc.risk}/10${detail}` })
        .eq("id", video.id);
      return true;
    }
  } catch (err) {
    console.error("fact-check step failed (non-blocking):", err);
  }
  return false;
}

async function latestNotes(db: Db, videoId: string): Promise<string | undefined> {
  const { data } = await db
    .from("approvals")
    .select("notes")
    .eq("video_id", videoId)
    .eq("decision", "revision")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.notes as string) ?? undefined;
}

/** Recurring QC failures on this project's prior scripts — distilled "lessons"
    fed back into the writer so it stops repeating the same mistakes. Pulls the
    issues from recent low-scoring SCRIPT-gate reviews, deduped and capped. */
async function qcLessons(db: Db, projectId: string): Promise<string[]> {
  const { data: vids } = await db.from("videos").select("id").eq("project_id", projectId);
  const ids = ((vids as { id: string }[]) ?? []).map((v) => v.id);
  if (ids.length === 0) return [];
  const { qcLessonBelow } = await getQualityGateConfig(db);
  const { data: revs } = await db
    .from("qc_reviews")
    .select("issues, score, created_at")
    .in("video_id", ids)
    .eq("gate", "SCRIPT")
    .lt("score", qcLessonBelow)
    .order("created_at", { ascending: false })
    .limit(6);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of (revs as { issues: string[] }[]) ?? []) {
    for (const raw of r.issues ?? []) {
      const text = String(raw).trim();
      const key = text.slice(0, 60).toLowerCase();
      if (text && !seen.has(key)) {
        seen.add(key);
        out.push(text.length > 240 ? `${text.slice(0, 240)}…` : text);
      }
      if (out.length >= 8) return out;
    }
  }
  // Merge the governed playbook's confident script-stage lessons (Harness C4):
  // evidence-backed, expiry-governed guidance, on top of the raw recent QC
  // issues. Deduped against what's already collected.
  for (const lesson of await playbookForStage(db, projectId, "script", 4)) {
    const key = lesson.slice(0, 60).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(lesson);
    }
    if (out.length >= 10) break;
  }
  return out;
}

async function nextScriptVersion(db: Db, videoId: string): Promise<number> {
  const { data } = await db
    .from("scripts")
    .select("version")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

/** The project's active script template, falling back to the default. */
export async function getActiveTemplate(
  db: Db,
  projectId: string,
  kind = "script",
): Promise<string> {
  const { data } = await db
    .from("prompt_templates")
    .select("body")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.body as string) || DEFAULT_SCRIPT_TEMPLATE;
}

// ── Stage bodies (live adapters with mock fallback) ───────────────────

async function runScripting(db: Db, video: Video, project: Project) {
  const notes = await latestNotes(db, video.id);
  const template = await getActiveTemplate(db, project.id);
  const lessons = await qcLessons(db, project.id);

  // Director length targeting (spec §4.5): when the operator picked a bracket at
  // idea time, its midpoint is the authoritative script target — the word budget
  // (scriptWordBudget) derives from it. Falls back to the video's target length.
  const effectiveTargetSec = video.length_target
    ? Math.round((video.length_target.minSec + video.length_target.maxSec) / 2)
    : video.target_length_sec;

  const draft = await generateScript({
    title: video.title,
    topic: video.topic,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    format: video.format,
    targetLengthSec: effectiveTargetSec,
    template,
    revisionNotes: notes,
    qcLessons: lessons,
    instructions: project.instructions ?? undefined,
    // Agent-training Step 2: proven winners (mined + this channel's own)
    // ride into the prompt as few-shot references. Best-effort.
    exemplars: await getScriptExemplars(db, project.id),
  });

  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: draft.body,
    beats: draft.beats,
    runtime_sec: draft.runtimeSec,
    metadata: draft.metadata,
  });
  await recordCost(
    db,
    video,
    {
      provider: draft.provider === "anthropic" ? "anthropic" : "mock:anthropic",
      usd: draft.costUsd,
      description: `Script draft (${draft.provider === "anthropic" ? "Claude" : "mock"})`,
    },
    `“${video.title}”`,
  );

  // VCE V1 — derive the Visual Bible from the fresh script (flagged). Conditions
  // every beat's visual prompt for relevance + consistency. Best-effort: a
  // failure never blocks the script gate, and with the flag off it never runs.
  try {
    const flags = await getVceFlags();
    if (flags.bible && !video.visual_bible) {
      const scriptText = (draft.beats ?? []).map((b) => `${b.text}\n[visual: ${b.visualPrompt}]`).join("\n\n");
      const { bible, costUsd } = await buildVisualBible({
        title: video.title,
        niche: project.niche,
        angle: project.angle,
        tone: project.tone,
        scriptText,
        brandPalette: project.brand_kit?.primary ? [project.brand_kit.primary, project.brand_kit.secondary].filter(Boolean) : undefined,
      });
      await db.from("videos").update({ visual_bible: bible }).eq("id", video.id);
      if (costUsd > 0) {
        await recordCost(db, video, { provider: "anthropic", usd: costUsd, description: "Visual bible" }, `“${video.title}”`);
      }
      // Decision trail (#9): the video's visual style is a first-class choice.
      const styleBible = bible as { styleContract?: string; palette?: string[]; avoid?: string[] };
      await recordDecision(db, {
        projectId: video.project_id,
        videoId: video.id,
        kind: "style",
        choice: styleBible.styleContract?.slice(0, 80) || "Visual bible",
        reasoning: styleBible.styleContract || "Locked a per-video visual style contract for consistency.",
        costUsd,
        params: { palette: styleBible.palette ?? [], avoid: styleBible.avoid ?? [] },
      });
    }
  } catch (err) {
    console.error("visual bible build failed (non-fatal):", err);
  }

  // Opt-in: curate kinetic highlights off the fresh script (auto when enabled).
  if (video.enable_highlights) {
    try {
      await runHighlightCuration(db, video, project, draft.beats);
    } catch (err) {
      // Never block the script gate on the highlight pass.
      console.error("highlight curation failed:", err);
    }
  }

  await setStatus(db, video.id, "SCRIPT_READY");
}

/** Curate highlights for a set of beats and persist them on the video. */
async function runHighlightCuration(
  db: Db,
  video: Video,
  project: Project,
  beats: ScriptBeat[],
): Promise<CuratedHighlight[]> {
  const targetCount =
    video.highlight_count > 0
      ? video.highlight_count
      : defaultHighlightCount(video.target_length_sec);
  const result = await curateHighlights({
    title: video.title,
    niche: project.niche,
    topic: video.topic,
    tone: project.tone,
    format: video.format,
    beats,
    targetCount,
    brandPrimary: project.brand_kit?.primary ?? "#F5B829",
  });
  await db.from("videos").update({ highlights: result.highlights }).eq("id", video.id);
  await recordCost(
    db,
    video,
    {
      provider: result.provider === "anthropic" ? "anthropic" : "mock:anthropic",
      usd: result.costUsd,
      description: `Highlight curation (${result.provider === "anthropic" ? "Claude" : "mock"})`,
    },
    `${result.highlights.length} highlights`,
  );
  return result.highlights;
}

/**
 * Synthesize live VO for one beat and persist it as a per-beat asset.
 * Identical text + voice within a project is synthesized once and reused
 * from `vo_cache` (e.g. the standard outro) — repeats are free.
 */
export async function synthesizeBeatVo(
  db: Db,
  video: Video,
  project: Project,
  beat: ScriptBeat,
  lexicon?: Lexicon,
  opts?: { forceNewTake?: boolean },
): Promise<{ costUsd: number; cached: boolean; provider: string }> {
  const voiceId = project.voice_id ?? "";
  // Visual-only sections have no narration — nothing to synthesize.
  if (!beat.text.trim()) return { costUsd: 0, cached: false, provider: voiceProviderFor(voiceId) };
  // Pronunciation pass: the voice hears the spoken form ("G P U"), captions keep
  // the clean display form ("GPU"). With no lexicon, spoken === display (a no-op
  // that preserves the original cache key). Cache on the SPOKEN text so changing
  // a pronunciation re-synthesizes rather than serving stale audio.
  const { spoken, plan } =
    lexicon && Object.keys(lexicon).length > 0
      ? toSpokenText(beat.text, lexicon)
      : { spoken: beat.text, plan: null as null | ReturnType<typeof toSpokenText>["plan"] };
  const textHash = createHash("sha256").update(spoken.trim()).digest("hex");

  // A "new take" (workspace regenerate) must actually re-synthesize — the
  // cache would hand back the identical audio for identical text.
  const { data: hit } = opts?.forceNewTake
    ? { data: null }
    : await db
        .from("vo_cache")
        .select("storage_path, duration_sec, words")
        .eq("project_id", project.id)
        .eq("voice_id", voiceId)
        .eq("text_hash", textHash)
        .maybeSingle();

  let storagePath: string;
  let durationSec: number;
  let words: unknown;
  let costUsd = 0;
  const provider = voiceProviderFor(voiceId);

  if (hit) {
    storagePath = hit.storage_path;
    durationSec = Number(hit.duration_sec ?? 0);
    words = hit.words ?? [];
  } else {
    const result = await synthesizeSpeech({ text: spoken, voiceId });
    // Distinct storage path per forced take so the previous take's audio file
    // survives for the version history (the cache row still converges to one).
    const takeSuffix = opts?.forceNewTake ? `-t${Date.now().toString(36)}` : "";
    storagePath = `vo-cache/${project.id}/${textHash.slice(0, 24)}${takeSuffix}.${result.fileExt}`;
    await uploadMedia(storagePath, result.audio, result.contentType);
    durationSec = result.durationSec;
    // Fold the spoken-aligned timings back onto the clean display tokens so
    // captions read "GPU" (not "G P U") while staying time-synced to the VO.
    words = plan ? remapWordTimings(plan, result.words) : result.words;
    costUsd = result.costUsd;
    await db.from("vo_cache").upsert(
      {
        project_id: project.id,
        voice_id: voiceId,
        text_hash: textHash,
        storage_path: storagePath,
        duration_sec: durationSec,
        words,
        cost_usd: costUsd,
      },
      { onConflict: "project_id,voice_id,text_hash" },
    );
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", beat.idx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "vo",
    provider,
    storage_path: storagePath,
    beat_index: beat.idx,
    meta: {
      durationSec,
      voice: project.voice_name ?? voiceId,
      words,
      cached: Boolean(hit),
    },
    cost_usd: costUsd,
  });
  return { costUsd, cached: Boolean(hit), provider };
}

/** Run an async fn over items with bounded concurrency — keeps us under
    provider rate/concurrency limits (e.g. ElevenLabs caps simultaneous TTS
    requests, which otherwise 429s and strands the whole stage). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function runAssetGeneration(db: Db, video: Video, project: Project) {
  const script = await loadLatestScript(db, video.id);
  const beats = (script?.beats ?? []) as ScriptBeat[];
  const scriptMeta = (script?.metadata ?? {}) as { thumbPhrase?: string };
  const stick = project.visual_style === "stick";

  // VCE V2 — the Medium Router (flagged). Plan each beat's cheapest satisfying
  // medium within budget, store the plan, and downshift beat shotTypes so
  // premium generative video is reserved for hero beats. Conservative: only
  // remap to concrete executable shotTypes (i2v/still/stock); free-graphics
  // mediums (chart/remotion/stick) keep their original shotType until V5
  // executes them, so this never regresses today's output. Best-effort.
  try {
    const flags = await getVceFlags();
    if (flags.router && beats.length > 0) {
      const budgetUsd = Number(project.max_video_usd ?? 8);
      const shotPlan = await planShots({
        beats,
        bible: video.visual_bible ?? null,
        budgetUsd,
        ctx: { budgetRemainingUsd: budgetUsd, stickAllowed: stick, dataVizAllowed: true },
      });
      await db.from("videos").update({ shot_plan: shotPlan }).eq("id", video.id);
      for (const b of beats) {
        const shot = shotPlan.beats.find((x) => x.beatIdx === b.idx)?.shots[0];
        if (!shot) continue;
        // Only apply executable remaps; leave chart/remotion/stick beats as-is.
        if (["i2v", "t2v", "still", "stock"].includes(shot.medium)) {
          b.shotType = mediumToShotType(shot.medium);
        }
      }
    }
  } catch (err) {
    console.error("shot planning failed (non-fatal):", err);
  }

  // VCE V4 — grounded generation (flagged). For factual beats (a named entity /
  // place / statistic), find a REAL licensed reference and store it so the beat
  // is grounded in reality; attribution flows to the publish-kit credits.
  // Best-effort; never blocks generation.
  try {
    const flags = await getVceFlags();
    if (flags.grounding && beats.length > 0) {
      const intents = mockBeatIntents(beats);
      const planned = new Map((video.shot_plan?.beats ?? []).map((b) => [b.beatIdx, b.shots[0]?.intent]));
      for (const it of intents) {
        const intent = planned.get(it.beatIdx) ?? it.intent;
        if (!wantsGrounding(intent)) continue;
        const beat = beats.find((b) => b.idx === it.beatIdx);
        if (!beat) continue;
        const ref = await findReference({ beatText: beat.text, visualPrompt: beat.visualPrompt, niche: project.niche });
        if (!ref) continue;
        await db.from("visual_refs").insert({
          project_id: project.id,
          video_id: video.id,
          beat_idx: beat.idx,
          source: ref.source,
          url: ref.url,
          license: ref.license,
          attribution: ref.attribution,
        });
      }
    }
  } catch (err) {
    console.error("visual grounding failed (non-fatal):", err);
  }

  // Tier 9 #4 — multi-image context: the auto tier (FREE stock extras for all;
  // economy may top up with cheap FLUX schnell) and which beats are AI-video
  // accents (skip those — their stills are i2v seeds, not the final visual).
  let autoTier: AutoTier = "economy";
  try {
    const runId = (video as { build_run_id?: string }).build_run_id;
    if (runId) {
      const { data: run } = await db.from("build_runs").select("tier").eq("id", runId).maybeSingle();
      if (run?.tier) autoTier = run.tier as AutoTier;
    }
  } catch {
    /* tier lookup is best-effort; defaults keep extras free */
  }
  const accentIdx = new Set<number>();
  try {
    const { data: jobs } = await db.from("clip_jobs").select("beat_idx").eq("video_id", video.id);
    for (const j of (jobs ?? []) as { beat_idx: number }[]) accentIdx.add(j.beat_idx);
  } catch {
    /* clip_jobs may not be queued yet — over-generation is bounded below */
  }

  // Tier 2 — changed-beat-only regen: keep the existing CLIP for any beat whose
  // content (visual prompt + shot type + narration) is unchanged since the last
  // generation; only changed/new beats are re-rendered (the expensive part).
  // VO/thumb/captions always refresh — VO is cached, so unchanged beats re-voice
  // for free. (Stick visuals are cheap to recompute, so they full-regen.)
  const hashByIdx = new Map(beats.map((b) => [b.idx, beatContentHash(b)]));
  const keepClipIdx = new Set<number>();
  if (!stick) {
    const { data: existingClips } = await db
      .from("assets")
      .select("beat_index, meta")
      .eq("video_id", video.id)
      .eq("kind", "clip");
    for (const c of (existingClips ?? []) as { beat_index: number | null; meta: { beatHash?: string } | null }[]) {
      if (c.beat_index != null && c.meta?.beatHash && c.meta.beatHash === hashByIdx.get(c.beat_index)) {
        keepClipIdx.add(c.beat_index);
      }
    }
  }

  // Replace the previous attempt's assets, but preserve unchanged-beat clips.
  await db.from("assets").delete().eq("video_id", video.id).in("kind", ["vo", "thumb", "captions"]);
  if (keepClipIdx.size > 0) {
    await db
      .from("assets")
      .delete()
      .eq("video_id", video.id)
      .eq("kind", "clip")
      .not("beat_index", "in", `(${[...keepClipIdx].join(",")})`);
  } else {
    await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip");
  }

  // VO and clips generate in parallel; the thumbnail is rendered later by the
  // farm (a hero still/frame + a controlled Claude kinetic phrase — no
  // AI-image text that can hallucinate brand names). Ledger writes happen
  // sequentially afterwards (recordCost mutates the running total).
  const liveVoice = canSynthesize(project.voice_id) && beats.length > 0;
  // Pronunciation pass (runs alongside narration): a per-script lexicon so the
  // narrator says "G P U" / "koo duh" instead of "gpoo" / "kewda". Curated niche
  // dictionary + an LLM-researched long tail; best-effort (never blocks VO).
  let lexicon: Lexicon | undefined;
  if (liveVoice) {
    try {
      const built = await buildScriptLexicon({
        title: video.title,
        niche: project.niche,
        topic: video.topic,
        beats,
      });
      lexicon = built.lexicon;
      if (built.costUsd > 0) {
        await recordCost(db, video, {
          provider: "anthropic",
          usd: built.costUsd,
          description: "Pronunciation research",
        });
      }
    } catch (err) {
      console.error("pronunciation lexicon build failed (non-fatal):", err);
    }
  }
  // Quality-gate config (prompt pre-check + cache), fetched once for all beats.
  const qualityGate = await getQualityGateConfig(db);

  // Tier 9.5 — programmatic data-viz inserts (footage projects only). Claude
  // proposes charts for number/ranking/trend beats and a research-operator pass
  // fact-checks the figures (corrects, downgrades to "illustrative", or drops).
  // A chart beat's visual IS the chart, so it's excluded from footage gen below.
  const chartByIdx = new Map<number, DataVizChart>();
  if (!stick) {
    try {
      const { charts, costUsd, dropped } = await planVerifiedCharts({
        title: video.title,
        niche: project.niche,
        beats,
      });
      for (const c of charts) chartByIdx.set(c.beatIdx, c);
      if (costUsd > 0) {
        await recordCost(db, video, {
          provider: "anthropic",
          usd: costUsd,
          description: `Data-viz propose + fact-check${dropped ? ` (${dropped} dropped)` : ""}`,
        });
      }
    } catch (err) {
      console.error("data-viz planning failed (non-fatal):", err);
    }
  }

  // Stick visuals (choreographed StickScene per beat) regen wholesale; footage
  // clips regen only for changed/new beats (unchanged ones keep their asset).
  // Chart beats never generate footage — their visual is the chart.
  const clipBeats = stick
    ? beats
    : beats.filter((b) => !keepClipIdx.has(b.idx) && !chartByIdx.has(b.idx));

  // Mid-stage budget reservation (Phase 2): estimate the batch about to fire
  // (VO chars + per-beat stills) and block BEFORE spending — budgetPause only
  // runs once per hop, and a long script can blow far past the cap within a
  // single stage otherwise. Throwing pauses the video via the hop's catch.
  const voChars = liveVoice ? beats.reduce((n, b) => n + b.text.length, 0) : 0;
  const stageEstimate = (voChars / 1000) * 0.17 + (stick ? 0 : clipBeats.length * 0.03) + 0.05;
  const stageBudget = await checkBudget(db, project, video, stageEstimate);
  if (!stageBudget.ok) {
    throw new Error(`${stageBudget.reason} — asset stage needs ~$${stageEstimate.toFixed(2)}`);
  }

  const [voResults, clipResults] = await Promise.all([
    // VO is the only unguarded provider call here — cap concurrency so a long
    // script can't 429 ElevenLabs and reject the whole stage.
    liveVoice
      ? mapLimit(beats, 2, (beat) => synthesizeBeatVo(db, video, project, beat, lexicon))
      : Promise.resolve(null),
    stick
      ? makeStickClips(video, project, beats)
      : // Cap concurrency (like VO above): firing every beat's FLUX call at once
        // bursts fal's rate limit (429) and degrades most beats to blank tiles.
        mapLimit(clipBeats, 3, (beat) => makeBeatClip(video, project, beat, { db, qualityGate })),
  ]);

  if (voResults) {
    for (const [i, r] of voResults.entries()) {
      await recordCost(
        db,
        video,
        {
          provider: r.provider,
          usd: r.costUsd,
          description: r.cached
            ? "Voiceover reused from cache — free"
            : "Voiceover synthesis",
        },
        `beat ${i + 1}`,
      );
    }
    // Tier 9 #2 — narrated intro hook. Synthesize the kinetic thumb phrase as a
    // short VO stored at beat_index -1; the render farm plays it over the intro
    // title card. Cached like any line, best-effort (never blocks the stage).
    const introPhrase = (scriptMeta.thumbPhrase ?? "").trim();
    if (liveVoice && introPhrase) {
      try {
        const introBeat: ScriptBeat = {
          idx: -1,
          text: introPhrase,
          visualPrompt: "",
          shotType: "broll",
        };
        const r = await synthesizeBeatVo(db, video, project, introBeat, lexicon);
        await recordCost(
          db,
          video,
          {
            provider: r.provider,
            usd: r.costUsd,
            description: r.cached ? "Intro hook VO reused — free" : "Intro hook VO",
          },
          "intro",
        );
      } catch (err) {
        console.error("intro hook VO failed (non-fatal):", err);
      }
    }
  } else {
    await sleep(STAGE_DELAY_MS);
    await db.from("assets").insert({
      video_id: video.id,
      kind: "vo",
      provider: "mock:elevenlabs",
      storage_path: `mock/${video.id}/vo.mp3`,
      meta: { durationSec: video.target_length_sec, voice: project.voice_name ?? "Sage" },
      cost_usd: MOCK_COSTS.voiceover.usd,
    });
    await recordCost(db, video, MOCK_COSTS.voiceover);
  }

  // Tier 9 #4 — cap economy's paid FLUX-extra fan-out per video so a clip_jobs
  // race (accents not yet queued) can't quietly run up schnell spend.
  let fluxExtraBudget = 4;
  for (const clip of clipResults) {
    const idx = clip.row.beat_index ?? 0;
    // Stamp the beat content hash so the next revision can detect unchanged beats.
    const h = hashByIdx.get(idx);
    if (h) clip.row.meta = { ...clip.row.meta, beatHash: h };
    // Multi-image section: only for still beats (FLUX stills, not stock VIDEO or
    // generated clips) that are long enough and aren't AI-video accents. Free
    // stock photos for all tiers; economy may top up with cheap FLUX schnell.
    const meta = clip.row.meta as { stillImage?: boolean; images?: string[] };
    const beat = beats.find((b) => b.idx === idx);
    const estSec = beat ? Math.max(4, beat.text.trim().split(/\s+/).length / 2.5) : 0;
    if (
      !stick &&
      meta.stillImage === true &&
      beat &&
      !accentIdx.has(idx) &&
      estSec >= MULTI_IMAGE_MIN_SEC
    ) {
      const allowFlux = autoTier === "economy" && fluxExtraBudget > 0;
      const { images, fluxUsed } = await extraStillsForBeat(db, video, project, beat, { allowFlux });
      fluxExtraBudget -= fluxUsed;
      if (images.length) clip.row.meta = { ...clip.row.meta, images };
    }
    await db.from("assets").insert(clip.row);
    await recordCost(db, video, clip.cost, `beat ${idx + 1}`);
    for (const ec of clip.extraCosts ?? []) {
      await recordCost(db, video, ec, `beat ${idx + 1}`);
    }
  }

  // Tier 9.5 — persist verified charts as clip assets (meta.dataViz). The visual
  // is drawn programmatically at render, so there's no storage_path/footage and
  // the cost is $0. Replace any prior clip on those beats (e.g. a beat that used
  // to be footage and is now a chart).
  for (const [idx, chart] of chartByIdx) {
    await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", idx);
    const h = hashByIdx.get(idx);
    await db.from("assets").insert({
      video_id: video.id,
      kind: "clip",
      provider: "remotion",
      storage_path: "",
      beat_index: idx,
      meta: {
        shotType: "broll",
        dataViz: chart,
        ...(h ? { beatHash: h } : {}),
      },
      cost_usd: 0,
    });
  }

  // Visual-floor guard: if every beat degraded to a mock tile (no FLUX, no
  // stock — e.g. an exhausted/invalid fal key AND no Pexels key) the render
  // would be wall-to-wall fallback cards. Flag it loudly so the cut surfaces as
  // needing attention rather than silently shipping a "blank" video. (A partial
  // failure still renders — captions + branded cards + any real beats.)
  if (!stick && clipResults.length > 0) {
    const mockCount = clipResults.filter((c) => c.row.provider.startsWith("mock:")).length;
    if (mockCount === clipResults.length) {
      console.error(
        `⚠️  ${video.id}: all ${mockCount} beat visuals failed (no FLUX + no stock). ` +
          `Check FAL_KEY credit/validity and PEXELS_API_KEY.`,
      );
      await db
        .from("videos")
        .update({
          paused_reason:
            "No beat visuals could be generated (image provider failed for every section). " +
            "Check the fal.ai key/credit and Pexels key, then re-run.",
        })
        .eq("id", video.id);
    }
  }

  // Pre-render visual variety check (Tier 4 #4): if two freshly-generated stills
  // are near-identical, re-roll one before paying to render the cut.
  if (!stick && clipResults.length > 1) {
    await diversifyBeatVisuals(db, video, project, beats, clipResults);
  }

  // Beat-visual RELEVANCE sweep: vision-check every still/stock against its
  // narration and re-roll/re-search the off-topic ones so the visuals actually
  // match what's being said (worst offender: keyword-searched stock).
  if (!stick && clipResults.length > 0) {
    await verifyBeatRelevance(db, video, project, beats);
  }

  // Captions: aggregate the per-beat word timings into one track.
  if (voResults) {
    const { data: voAssets } = await db
      .from("assets")
      .select("beat_index, meta")
      .eq("video_id", video.id)
      .eq("kind", "vo")
      // Exclude the intro hook VO (beat_index -1) — it plays over the title
      // card, not the beat timeline, so it must not shift the caption track.
      .gte("beat_index", 0)
      .order("beat_index", { ascending: true });
    let offset = 0;
    const track: { w: string; start: number; end: number }[] = [];
    for (const a of voAssets ?? []) {
      const meta = a.meta as { durationSec?: number; words?: typeof track };
      for (const w of meta.words ?? []) {
        track.push({ w: w.w, start: w.start + offset, end: w.end + offset });
      }
      offset += Number(meta.durationSec ?? 0);
    }
    const captionsPath = `videos/${video.id}/captions.json`;
    await uploadMedia(captionsPath, JSON.stringify(track), "application/json");
    await db.from("assets").insert({
      video_id: video.id,
      kind: "captions",
      provider: voiceProviderFor(project.voice_id),
      storage_path: captionsPath,
      meta: { words: track.length, durationSec: offset },
      cost_usd: 0,
    });
  } else {
    await db.from("assets").insert({
      video_id: video.id,
      kind: "captions",
      provider: "mock:elevenlabs",
      storage_path: `mock/${video.id}/captions.json`,
      meta: { words: 940 },
      cost_usd: 0,
    });
  }
  await setStatus(db, video.id, "ASSETS_READY");
}

type AssetDraft = {
  row: {
    video_id: string;
    kind: string;
    provider: string;
    storage_path: string;
    beat_index?: number;
    meta: Record<string, unknown>;
    cost_usd: number;
  };
  cost: { provider: string; usd: number; description: string };
  /** Secondary costs (e.g. a prompt pre-check refine, or a discarded blank
      render) recorded by the caller sequentially — keeps parallel generation off
      the cost-total race. */
  extraCosts?: { provider: string; usd: number; description: string }[];
};

/** Stable content hash of a beat's visual identity (Tier 2): used to keep a
    beat's existing clip on revision when nothing about it changed. "Stricter"
    mode includes the narration text, so any text edit re-generates the beat. */
function beatContentHash(beat: ScriptBeat): string {
  return createHash("sha256")
    .update(`${beat.visualPrompt}|${beat.shotType}|${beat.text}`)
    .digest("hex");
}

/** Tier 9 #4 — extra stills so a long still section can cross-dissolve through
    2–3 frames instead of holding one. Base (and the default) pull FREE Pexels
    photos; economy tops up with a cheap FLUX schnell variant only when stock is
    thin (so base stays $0 and economy still gets motion when Pexels is dry).
    Best-effort and cheap — returns storage paths (FLUX) and external urls
    (stock); the render farm resolves both. Never throws into the asset stage. */
export const MULTI_IMAGE_EXTRA = 2; // + the primary still = up to 3 frames.
/** A still section must be at least this long to earn extra cross-dissolve
    frames (mirrors MULTI_IMAGE_MIN_SEC in packages/render so the asset stage
    only generates extras the renderer will actually use). */
export const MULTI_IMAGE_MIN_SEC = 10;
export async function extraStillsForBeat(
  db: Db,
  video: Video,
  project: Project,
  beat: ScriptBeat,
  opts: { allowFlux: boolean },
): Promise<{ images: string[]; fluxUsed: number }> {
  const images: string[] = [];
  let fluxUsed = 0;
  try {
    images.push(...(await searchStockPhotos(beat.visualPrompt, MULTI_IMAGE_EXTRA)));
  } catch {
    /* stock is optional */
  }
  if (opts.allowFlux && images.length < MULTI_IMAGE_EXTRA && isFalLive()) {
    const need = MULTI_IMAGE_EXTRA - images.length;
    for (let i = 0; i < need; i++) {
      try {
        const prompt = buildVisualPrompt(
          `${beat.visualPrompt} — alternate composition ${i + 2}`,
          project.brand_kit.thumbnailStyle,
        );
        const img = await generateImage({ prompt, quality: "schnell" });
        const path = `videos/${video.id}/beat-${beat.idx}-extra-${i}.jpg`;
        await uploadMedia(path, img.image, "image/jpeg");
        images.push(path);
        fluxUsed++;
        if (img.costUsd > 0) {
          await recordCost(
            db,
            video,
            { provider: "fal.ai", usd: img.costUsd, description: "Multi-image extra still (FLUX schnell)" },
            `beat ${beat.idx + 1}`,
          );
        }
      } catch {
        /* an extra still is best-effort — never blocks the cut */
      }
    }
  }
  return { images: images.slice(0, MULTI_IMAGE_EXTRA), fluxUsed };
}

/** One beat's visual: stock beats search Pexels (free), hero beats get a
    premium FLUX render, b-roll gets the fast/cheap FLUX tier. Any provider
    failure degrades to a mock tile rather than failing the stage. */
export async function makeBeatClip(
  video: Video,
  project: Project,
  beat: ScriptBeat,
  opts?: { db?: Db; qualityGate?: QualityGateConfig; forceRegen?: boolean },
): Promise<AssetDraft> {
  let scene = beat.visualPrompt;
  // VCE V1 — condition the prompt on the video's Visual Bible (null → unchanged).
  const bible = video.visual_bible ?? null;
  // ClickMax §4.6: project instructions ride along on every visual prompt.
  const styleContext = project.instructions?.trim()
    ? `${project.brand_kit.thumbnailStyle}. ${project.instructions.trim()}`
    : project.brand_kit.thumbnailStyle;
  let prompt = buildVisualPrompt(scene, styleContext, bible);
  // Secondary costs (prompt refine, discarded blank renders) are returned to the
  // caller and recorded sequentially (parallel recordCost would race the total).
  const extraCosts: NonNullable<AssetDraft["extraCosts"]> = [];
  const db = opts?.db;
  const gateOn = Boolean(opts?.qualityGate?.enabled);
  try {
    if (beat.shotType === "stock") {
      const stock = await searchStockClip(beat.visualPrompt, { relevanceText: beat.text });
      if (stock) {
        return {
          row: {
            video_id: video.id,
            kind: "clip",
            provider: "pexels",
            storage_path: "",
            beat_index: beat.idx,
            meta: {
              shotType: beat.shotType,
              url: stock.url,
              posterUrl: stock.posterUrl,
              durationSec: stock.durationSec,
              pexelsId: stock.pexelsId,
              credit: stock.photographer,
            },
            cost_usd: 0,
          },
          cost: { provider: "pexels", usd: 0, description: "Licensed stock clip — free" },
        };
      }
      // No stock match → fall through to a generated still.
    }
    if (isFalLive()) {
      // Validate the prompt BEFORE paying FLUX. Weak prompt → one cheap re-prompt;
      // if we can't refine (art-director unavailable), skip the paid render and
      // fall through to free stock/mock (fail-closed).
      let canPay = true;
      // Pre-pay gate: structural check + relevance-to-narration (B3). A prompt
      // that's fine structurally but doesn't reflect the beat's narration is
      // generic "wallpaper" — refine it (narration-aware) before paying FLUX.
      const structuralBad = !assessVisualPrompt(scene).ok;
      const relevanceBad = !assessPromptRelevance(scene, beat.text).ok;
      if (gateOn && (structuralBad || relevanceBad)) {
        if (isArtDirectorLive()) {
          const refined = await refineOneShot({
            prompt: scene,
            niche: project.niche,
            title: video.title,
            narration: relevanceBad ? beat.text : undefined,
            antiPatterns: project.autofix_memory?.antiPatterns,
          });
          if (refined?.prompt) {
            scene = refined.prompt;
            prompt = buildVisualPrompt(scene, project.brand_kit.thumbnailStyle, bible);
            if (refined.costUsd > 0) {
              extraCosts.push({ provider: "anthropic", usd: refined.costUsd, description: "Prompt pre-check refine" });
            }
          } else {
            canPay = false;
          }
        } else {
          canPay = false;
        }
      }
      if (canPay) {
        // Every beat still now renders on FLUX dev, not just heroes: the still
        // seeds the i2v clip (and IS the visual on still/Ken-Burns beats), so a
        // low-fidelity schnell seed caps the whole shot. dev is ~$0.02 more per
        // still — negligible next to the clip/VO spend, high leverage on quality.
        const quality = "dev" as const;

        // Per-project FLUX still cache: an identical (prompt, quality) is rendered
        // once per project and reused — unchanged beats re-gen for $0.
        const cacheKey = createHash("sha256").update(`${prompt}|${quality}`).digest("hex");
        if (db && !opts?.forceRegen) {
          try {
            const { data: hit } = await db
              .from("flux_cache")
              .select("storage_path")
              .eq("project_id", project.id)
              .eq("cache_key", cacheKey)
              .maybeSingle();
            if (hit?.storage_path) {
              return {
                row: {
                  video_id: video.id,
                  kind: "clip",
                  provider: "fal.ai",
                  storage_path: hit.storage_path,
                  beat_index: beat.idx,
                  meta: { shotType: beat.shotType, stillImage: true, model: `flux/${quality}`, cached: true },
                  cost_usd: 0,
                },
                cost: { provider: "fal.ai", usd: 0, description: "FLUX still reused from cache — free" },
                extraCosts,
              };
            }
          } catch {
            /* cache table absent (migration pending) → generate normally */
          }
        }

        let img = await generateImage({ prompt, quality });
        let genUsd = img.costUsd;
        // Pixel check (Tier 2): reject blank/solid/tiny renders. One re-roll; if
        // it's still bad, record the wasted spend and fall through to stock/mock.
        let usable = true;
        if (gateOn && (await inspectStill(img.image)).bad) {
          const retry = await generateImage({ prompt, quality });
          genUsd += retry.costUsd;
          if ((await inspectStill(retry.image)).bad) usable = false;
          else img = retry;
        }
        if (usable) {
          const path = db
            ? `flux-cache/${project.id}/${cacheKey.slice(0, 24)}.jpg`
            : `videos/${video.id}/beat-${beat.idx}.jpg`;
          await uploadMedia(path, img.image, "image/jpeg");
          // Perceptual hash for cross-beat variety detection (Tier 4 #4).
          const phash = await perceptualHash(img.image);
          if (db) {
            try {
              await db.from("flux_cache").upsert(
                { project_id: project.id, cache_key: cacheKey, quality, storage_path: path, cost_usd: genUsd },
                { onConflict: "project_id,cache_key" },
              );
            } catch {
              /* cache table absent → skip caching, the asset still renders */
            }
          }
          return {
            row: {
              video_id: video.id,
              kind: "clip",
              provider: "fal.ai",
              storage_path: path,
              beat_index: beat.idx,
              meta: {
                shotType: beat.shotType,
                stillImage: true,
                model: `flux/${quality}`,
                ...(phash ? { phash } : {}),
                // Exact request needed to reproduce / re-roll this still (C2).
                request: {
                  kind: "still",
                  provider: "fal.ai",
                  endpoint: img.endpoint,
                  prompt,
                  quality,
                  imageSize: "landscape_16_9",
                  seed: img.seed,
                },
              },
              cost_usd: genUsd,
            },
            cost: {
              provider: "fal.ai",
              usd: genUsd,
              description: quality === "dev" ? "Hero shot (FLUX dev)" : "B-roll still (FLUX schnell)",
            },
            extraCosts,
          };
        }
        // Both renders were blank — record the paid-but-discarded spend so it is
        // not lost, then fall through to the free stock/mock fallback below.
        extraCosts.push({ provider: "fal.ai", usd: genUsd, description: "Discarded blank FLUX renders" });
      }
    }
  } catch (err) {
    console.error(`beat ${beat.idx} visual generation failed:`, err);
  }
  // Last-resort visible fallback: when FLUX failed (rate limit, outage, no
  // credit) on a non-stock beat, try free Pexels stock so the beat still has
  // real footage rather than shipping a blank tile. (Stock beats already tried
  // Pexels above.) Only an empty/failed stock search drops to the mock tile.
  if (beat.shotType !== "stock") {
    try {
      const rescue = await searchStockClip(beat.visualPrompt, { relevanceText: beat.text });
      if (rescue) {
        return {
          row: {
            video_id: video.id,
            kind: "clip",
            provider: "pexels",
            storage_path: "",
            beat_index: beat.idx,
            meta: {
              shotType: beat.shotType,
              url: rescue.url,
              posterUrl: rescue.posterUrl,
              durationSec: rescue.durationSec,
              pexelsId: rescue.pexelsId,
              credit: rescue.photographer,
              rescued: true,
            },
            cost_usd: 0,
          },
          cost: { provider: "pexels", usd: 0, description: "Stock fallback (FLUX unavailable) — free" },
          extraCosts,
        };
      }
    } catch (err) {
      console.error(`beat ${beat.idx} stock fallback failed:`, err);
    }
  }
  const stock = beat.shotType === "stock";
  return {
    row: {
      video_id: video.id,
      kind: "clip",
      provider: stock ? "mock:pexels" : "mock:fal.ai",
      storage_path: `mock/${video.id}/clip-${beat.idx}.mp4`,
      beat_index: beat.idx,
      meta: { shotType: beat.shotType },
      cost_usd: stock ? MOCK_COSTS.stockClip.usd : MOCK_COSTS.clip.usd,
    },
    cost: stock ? MOCK_COSTS.stockClip : MOCK_COSTS.clip,
    extraCosts,
  };
}

// Seed-still floor lives in quality-gates config (seedVisionFloor).

/**
 * Tier 4 #1 — seed-still vision gate. Before a beat's still is animated into a
 * PAID video clip, critique it with the vision model; a weak/off-prompt seed is
 * re-rolled (cheap) rather than animated (expensive). Best-effort: never throws,
 * skips when the vision model is unavailable or the seed isn't a real still.
 */
async function vetSeedStillForBeat(db: Db, video: Video, project: Project, beat: ScriptBeat): Promise<void> {
  if (!isSeedVisionLive()) return;
  try {
    const { data: still } = await db
      .from("assets")
      .select("storage_path, provider, meta")
      .eq("video_id", video.id)
      .eq("kind", "clip")
      .eq("beat_index", beat.idx)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // Only vet a real still we own — skip mock placeholders and existing videos.
    if (!still?.storage_path || String(still.provider).startsWith("mock:")) return;
    if ((still.meta as { isVideo?: boolean } | null)?.isVideo) return;
    const url = await getSignedMediaUrl(still.storage_path);
    if (!url) return;

    const qg = await getQualityGateConfig(db);
    let fresh = (await getVideo(db, video.id)) ?? video;

    // Two independent bars before we pay to ANIMATE this seed (AI video beats):
    //  1. quality/artifacts (critiqueSeedStill), and
    //  2. narration RELEVANCE — the same strict "does this depict the subject"
    //     check stills/stock get, applied here so an off-topic seed is caught
    //     while it's still a cheap still, not an expensive animated clip.
    const critique = await critiqueSeedStill({ imageUrl: url, visualPrompt: beat.visualPrompt, beatText: beat.text });
    if (critique?.costUsd) {
      await recordCost(db, fresh, { provider: "anthropic", usd: critique.costUsd, description: "Seed-still vision gate" }, `beat ${beat.idx + 1}`);
    }
    const relevance = isBeatRelevanceLive()
      ? await verifyBeatVisual({ imageUrl: url, narration: beat.text, visualPrompt: beat.visualPrompt, niche: project.niche })
      : null;
    if (relevance?.costUsd) {
      fresh = (await getVideo(db, video.id)) ?? fresh;
      await recordCost(db, fresh, { provider: "anthropic", usd: relevance.costUsd, description: "Seed-still relevance gate" }, `beat ${beat.idx + 1}`);
    }

    const qualityWeak = critique != null && critique.score < qg.seedVisionFloor;
    const relevanceWeak = relevance != null && relevance.relevance < qg.beatRelevanceFloor;
    if (!qualityWeak && !relevanceWeak) return; // seed passes both → animate it

    // VCE V3 — the targeted refine. Instead of a generic steer, feed the critic's
    // SPECIFIC complaint into the prompt via nextPrompt (keeps the Visual-Bible
    // conditioning) and log the attempt. Flag off → the legacy single steer.
    const refineOn = (await getVceFlags()).refine;
    const criticNote =
      relevanceWeak && relevance?.betterQuery
        ? `It MUST clearly depict: ${relevance.betterQuery}.`
        : critique?.issues?.[0] ?? "Improve clarity and match the narration precisely.";
    const beforeScore = Math.min(critique?.score ?? 10, relevance?.relevance ?? 10);

    // Re-roll a fresh still (forceRegen overwrites the cache so the rejected
    // image is never re-served); replace the asset.
    fresh = (await getVideo(db, video.id)) ?? fresh;
    const steeredPrompt = refineOn
      ? nextPrompt(beat.visualPrompt, criticNote)
      : relevanceWeak && relevance?.betterQuery
        ? `${beat.visualPrompt}. It MUST clearly depict: ${relevance.betterQuery}.`
        : beat.visualPrompt;
    const steeredBeat = steeredPrompt === beat.visualPrompt ? beat : { ...beat, visualPrompt: steeredPrompt };
    const draft = await makeBeatClip(fresh, project, steeredBeat, { db, qualityGate: qg, forceRegen: true });
    if (String(draft.row.provider).startsWith("mock:")) return; // re-roll failed → keep the original
    draft.row.meta = { ...draft.row.meta, beatHash: beatContentHash(beat), seedRerolled: true };
    await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", beat.idx);
    await db.from("assets").insert(draft.row);
    fresh = (await getVideo(db, video.id)) ?? fresh;
    await recordCost(db, fresh, draft.cost, `beat ${beat.idx + 1} (seed re-roll)`);
    for (const ec of draft.extraCosts ?? []) await recordCost(db, fresh, ec, `beat ${beat.idx + 1}`);

    if (refineOn) {
      // Re-critique the fresh still and audit the targeted attempt. Cheap-first:
      // this vets the still before any paid animation, and the DI orchestrator
      // (pipeline/beat-refine.ts) is the reference for extending to N attempts.
      let toScore = beforeScore;
      try {
        const newUrl = await getSignedMediaUrl(draft.row.storage_path as string);
        const recrit = newUrl ? await critiqueSeedStill({ imageUrl: newUrl, visualPrompt: steeredPrompt, beatText: beat.text }) : null;
        if (recrit) {
          toScore = recrit.score;
          if (recrit.costUsd) await recordCost(db, fresh, { provider: "anthropic", usd: recrit.costUsd, description: "Seed-still re-critique" }, `beat ${beat.idx + 1}`);
        }
      } catch { /* re-critique is best-effort */ }
      try {
        await db.from("beat_refine_runs").insert({
          video_id: video.id,
          beat_idx: beat.idx,
          attempt: 1,
          from_score: beforeScore,
          to_score: toScore,
          critic_note: criticNote,
          prompt_before: beat.visualPrompt,
          prompt_after: steeredPrompt,
          medium: "still",
          cost_usd: Number(draft.cost.usd ?? 0),
        });
      } catch { /* audit is best-effort */ }
    }
  } catch (err) {
    console.error(`seed-still vision gate failed (beat ${beat.idx}):`, err);
  }
}

// Variety min-distance lives in quality-gates config (varietyMinDistance).

/**
 * Tier 4 #4 — pre-render visual variety. Compare freshly-generated stills by
 * perceptual hash; if two beats are near-identical, re-roll the later one ONCE
 * (bounded) so the cut isn't wall-to-wall the same shot — a frame-critic failure
 * mode we'd otherwise only pay to discover after a full render. Best-effort.
 */
async function diversifyBeatVisuals(
  db: Db,
  video: Video,
  project: Project,
  beats: ScriptBeat[],
  clipResults: AssetDraft[],
): Promise<void> {
  try {
    const hashed = clipResults
      .map((c) => ({ idx: c.row.beat_index ?? -1, phash: (c.row.meta as { phash?: string }).phash }))
      .filter((x): x is { idx: number; phash: string } => x.idx >= 0 && Boolean(x.phash));
    if (hashed.length < 2) return;
    let worst: { idx: number; d: number } | null = null;
    for (let i = 0; i < hashed.length; i++) {
      for (let j = i + 1; j < hashed.length; j++) {
        const d = hammingDistance(hashed[i].phash, hashed[j].phash);
        if (!worst || d < worst.d) worst = { idx: Math.max(hashed[i].idx, hashed[j].idx), d };
      }
    }
    if (!worst || worst.d > (await getQualityGateConfig(db)).varietyMinDistance) return;
    const beat = beats.find((b) => b.idx === worst!.idx);
    if (!beat) return;
    const qg = await getQualityGateConfig(db);
    const fresh = (await getVideo(db, video.id)) ?? video;
    const draft = await makeBeatClip(fresh, project, beat, { db, qualityGate: qg, forceRegen: true });
    if (String(draft.row.provider).startsWith("mock:")) return;
    draft.row.meta = { ...draft.row.meta, beatHash: beatContentHash(beat), varietyReroll: true };
    await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", worst.idx);
    await db.from("assets").insert(draft.row);
    const v2 = (await getVideo(db, video.id)) ?? fresh;
    await recordCost(db, v2, draft.cost, `beat ${worst.idx + 1} (variety re-roll)`);
    for (const ec of draft.extraCosts ?? []) await recordCost(db, v2, ec, `beat ${worst.idx + 1}`);
  } catch (err) {
    console.error("variety diversify failed:", err);
  }
}

/** Max off-topic beats to re-roll per video (bounds cost; worst-first). */
const MAX_RELEVANCE_REROLLS = 5;

/**
 * Beat-visual RELEVANCE sweep (vision). For every non-video beat, look at the
 * ACTUAL chosen still/stock and score whether it depicts the narration's
 * subject. Store the verdict on the asset (surfaced in review), and re-roll the
 * worst off-topic beats — steering a stock re-search or a still regen toward
 * the subject the model named. Best-effort; skipped when vision isn't live.
 */
async function verifyBeatRelevance(
  db: Db,
  video: Video,
  project: Project,
  beats: ScriptBeat[],
): Promise<void> {
  if (!isBeatRelevanceLive()) return;
  try {
    const floor = (await getQualityGateConfig(db)).beatRelevanceFloor;
    const { data: clips } = await db
      .from("assets")
      .select("id, beat_index, provider, storage_path, meta")
      .eq("video_id", video.id)
      .eq("kind", "clip");
    const byBeat = new Map<number, { id: string; provider: string; storage_path: string | null; meta: Record<string, unknown> }>();
    for (const c of (clips ?? []) as { id: string; beat_index: number | null; provider: string; storage_path: string | null; meta: Record<string, unknown> }[]) {
      if (c.beat_index != null) byBeat.set(c.beat_index, c);
    }

    const offTopic: { beat: ScriptBeat; assetId: string; isStock: boolean; verdict: BeatRelevance }[] = [];
    for (const beat of beats) {
      const asset = byBeat.get(beat.idx);
      if (!asset) continue;
      const meta = (asset.meta ?? {}) as { isVideo?: boolean; posterUrl?: string; url?: string };
      if (meta.isVideo) continue; // AI video — relevance-checked at its SEED still (pre-animation, cheap to fix); re-rolling a finished paid clip is not
      if (String(asset.provider).startsWith("mock:")) continue; // no key → nothing real to judge
      const imageUrl = asset.storage_path
        ? await getSignedMediaUrl(asset.storage_path)
        : meta.posterUrl || meta.url || undefined;
      if (!imageUrl) continue;

      const verdict = await verifyBeatVisual({
        imageUrl,
        narration: beat.text,
        visualPrompt: beat.visualPrompt,
        niche: project.niche,
      });
      if (!verdict) continue;
      const fresh = (await getVideo(db, video.id)) ?? video;
      if (verdict.costUsd > 0) {
        await recordCost(db, fresh, { provider: "anthropic", usd: verdict.costUsd, description: "Beat visual relevance check" }, `beat ${beat.idx + 1}`);
      }
      await db
        .from("assets")
        .update({ meta: { ...asset.meta, relevance: { score: verdict.relevance, depicts: verdict.depicts, reason: verdict.reason } } })
        .eq("id", asset.id);
      if (verdict.relevance < floor) {
        offTopic.push({ beat, assetId: asset.id, isStock: !asset.storage_path, verdict });
      }
    }

    // Re-roll the worst offenders (bounded), steering toward the named subject.
    offTopic.sort((a, b) => a.verdict.relevance - b.verdict.relevance);
    let rerolls = 0;
    for (const off of offTopic) {
      if (rerolls >= MAX_RELEVANCE_REROLLS) break;
      // A stock beat re-searches Pexels with the model's subject keywords; a
      // still regenerates FLUX with the subject appended to its scene.
      const steered: ScriptBeat = off.isStock
        ? { ...off.beat, visualPrompt: off.verdict.betterQuery || off.beat.visualPrompt }
        : { ...off.beat, visualPrompt: `${off.beat.visualPrompt}. It MUST clearly depict: ${off.verdict.betterQuery}.` };
      const qg = await getQualityGateConfig(db);
      const fresh = (await getVideo(db, video.id)) ?? video;
      const draft = await makeBeatClip(fresh, project, steered, { db, qualityGate: qg, forceRegen: true });
      if (String(draft.row.provider).startsWith("mock:")) continue; // re-roll unavailable → keep original

      // Verify the replacement actually improved; keep whichever is more on-topic.
      const newMeta = (draft.row.meta ?? {}) as { posterUrl?: string; url?: string };
      const newUrl = draft.row.storage_path
        ? await getSignedMediaUrl(draft.row.storage_path)
        : newMeta.posterUrl || newMeta.url || undefined;
      let keep = true;
      let newRelevance = off.verdict.relevance;
      if (newUrl) {
        const recheck = await verifyBeatVisual({ imageUrl: newUrl, narration: off.beat.text, visualPrompt: steered.visualPrompt, niche: project.niche });
        if (recheck) {
          const v2 = (await getVideo(db, video.id)) ?? fresh;
          if (recheck.costUsd > 0) await recordCost(db, v2, { provider: "anthropic", usd: recheck.costUsd, description: "Beat visual relevance recheck" }, `beat ${off.beat.idx + 1}`);
          keep = recheck.relevance > off.verdict.relevance;
          newRelevance = recheck.relevance;
        }
      }
      if (!keep) continue; // the replacement was no better — leave the original in place

      draft.row.meta = {
        ...draft.row.meta,
        beatHash: beatContentHash(off.beat),
        relevanceReroll: true,
        relevance: { score: newRelevance, depicts: off.verdict.depicts, reason: "re-rolled for narration relevance" },
      };
      await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", off.beat.idx);
      await db.from("assets").insert(draft.row);
      const v3 = (await getVideo(db, video.id)) ?? fresh;
      await recordCost(db, v3, draft.cost, `beat ${off.beat.idx + 1} (relevance re-roll)`);
      for (const ec of draft.extraCosts ?? []) await recordCost(db, v3, ec, `beat ${off.beat.idx + 1}`);
      rerolls++;
      console.log(`🎯 beat ${off.beat.idx + 1}: relevance ${off.verdict.relevance}→${newRelevance} (${off.isStock ? "re-searched stock" : "regenerated still"})`);
    }
  } catch (err) {
    console.error("beat relevance sweep failed:", err);
  }
}

/** Stick Studio: one choreographer call → a stick scene per beat, stored as the
    beat's "clip" asset (provider 'stick'). Replaces AI/stock clip spend with a
    single cheap LLM call (cost attributed to the first beat). */
async function makeStickClips(
  video: Video,
  project: Project,
  beats: ScriptBeat[],
): Promise<AssetDraft[]> {
  const choreo = await choreographStickScenes({
    title: video.title,
    niche: project.niche,
    topic: video.topic,
    tone: project.tone,
    format: video.format,
    beats,
  });
  const provider = choreo.provider === "anthropic" ? "anthropic" : "mock:stick";
  return beats.map((beat, i) => ({
    row: {
      video_id: video.id,
      kind: "clip",
      provider: "stick",
      storage_path: "",
      beat_index: beat.idx,
      meta: { shotType: beat.shotType, stickScene: choreo.scenes[i] },
      cost_usd: i === 0 ? choreo.costUsd : 0,
    },
    cost: {
      provider,
      usd: i === 0 ? choreo.costUsd : 0,
      description:
        i === 0
          ? `Stick choreography (${beats.length} scenes) — ${choreo.provider}`
          : "Stick scene — free",
    },
  }));
}

async function runAssembly(db: Db, video: Video): Promise<"external" | void> {
  // Live-asset videos are rendered by the GitHub Actions farm (cron, ≤10 min
  // pickup): leave the video at ASSEMBLING; the worker advances it to
  // FINAL_REVIEW when the MP4 + Short land in Storage.
  const { data: liveVo } = await db
    .from("assets")
    .select("id")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .not("provider", "like", "mock:%")
    .limit(1);
  if (liveVo && liveVo.length > 0) return "external";

  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "render");
  await sleep(STAGE_DELAY_MS);
  const short = video.kind === "short";
  await db.from("assets").insert({
    video_id: video.id,
    kind: "render",
    provider: "mock:remotion",
    storage_path: `mock/${video.id}/${short ? "short" : "final"}.mp4`,
    meta: {
      variant: short ? "short" : "long",
      resolution: short ? "1080x1920" : "1080p",
      durationSec: video.target_length_sec,
    },
    cost_usd: MOCK_COSTS.render.usd,
  });
  await recordCost(db, video, MOCK_COSTS.render);
  await setStatus(db, video.id, "FINAL_REVIEW");
}

// ── Engine entry point ────────────────────────────────────────────────

/**
 * Advances a video through every stage it can run unattended, stopping at
 * the next review gate (or on a budget/kill pause). Safe to call after any
 * decision — it picks up from the video's current status.
 */
export async function runPipeline(videoId: string, dbArg?: Db): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());

  for (let hop = 0; hop < 8; hop++) {
    const video = await getVideo(db, videoId);
    if (!video) return { ok: false, error: "Video not found" };
    const project = await getProject(db, video.project_id);
    if (!project) return { ok: false, error: "Project not found" };

    // Director Mode master guard (spec §4.1): the engine never self-advances a
    // director project. Because every autonomous caller — crons, sweeps,
    // gate-approve chaining, Telegram, MCP, build-runner — ultimately reaches a
    // video through this loop, this single early return neutralizes all of
    // them at once. The operator advances a director video ONLY via
    // runDirectedStage (one press = one stage). Re-checked here (not just at
    // the sweep query) so a mode flip mid-sweep can't drag the video along.
    if (isDirectorMode(project)) return { ok: true };

    if (await isKillSwitchOn(db)) {
      await db
        .from("videos")
        .update({ paused_reason: "Global kill switch is on" })
        .eq("id", videoId);
      return { ok: false, error: "Global kill switch is on" };
    }
    if (project.status !== "active") {
      await db
        .from("videos")
        .update({ paused_reason: "Project is paused" })
        .eq("id", videoId);
      return { ok: false, error: "Project is paused" };
    }

    const gate = GATE_FOR_STATUS[video.status];
    if (gate) {
      if (video.paused_reason)
        await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
      await arriveAtGate(db, video, project, gate);
      return { ok: true };
    }

    const paidStage = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"]
      .includes(video.status);
    if (paidStage) {
      const pause = await budgetPause(db, video, project);
      if (pause) {
        await db.from("videos").update({ paused_reason: pause }).eq("id", videoId);
        return { ok: false, error: pause };
      }
      if (video.paused_reason)
        await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
    }

    const out = await runStageBody(db, video, project, "pipeline stage");
    if (!out.ok) return { ok: false, error: out.error };
    if (out.external || out.terminal) return { ok: true };
  }
  return { ok: true };
}

type StageOutcome = {
  ok: boolean;
  error?: string;
  /** runAssembly handed off to the render farm — stop driving locally. */
  external?: boolean;
  /** Status has no working-stage body (gate/APPROVED/TRACKING/KILLED/…). */
  terminal?: boolean;
};

/**
 * ClickMax-transition Phase 1 seam: run the CURRENT working-stage body exactly
 * once. The single stage switch shared by the autonomous hop loop
 * (`runPipeline`), Director single-step (`runDirectedStage`), and the
 * workspace Continue action (`advanceStage`) — so the three drivers can never
 * drift in what a stage *does*, only in how far they drive.
 *
 * A thrown stage (e.g. a live provider error) must never leave the video
 * silently stuck: it records a visible, retryable pause reason instead.
 */
async function runStageBody(
  db: Db,
  video: Video,
  project: Project,
  label: string,
): Promise<StageOutcome> {
  try {
    switch (video.status) {
      case "IDEA_APPROVED":
        await setStatus(db, video.id, "SCRIPTING");
        break;
      case "SCRIPTING":
        await runScripting(db, video, project);
        break;
      case "GENERATING_ASSETS":
        await runAssetGeneration(db, video, project);
        break;
      case "ASSEMBLING": {
        const result = await runAssembly(db, video);
        if (result === "external") return { ok: true, external: true }; // farm takes over
        break;
      }
      default:
        return { ok: true, terminal: true }; // APPROVED / TRACKING / KILLED / NEEDS_REVISION
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stage = video.status.replace(/_/g, " ").toLowerCase();
    const reason = `${stage} paused — ${humanizeProviderError(msg)}`;
    await db.from("videos").update({ paused_reason: reason }).eq("id", video.id);
    // Trust-the-chat: the pause reaches the thread, not just a banner field.
    await postWorkspaceNote(db, video, `I hit a problem: ${reason}. Say “continue” to retry once it's resolved.`, {
      event: "stage_paused",
      status: video.status,
    });
    console.error(`${label} ${video.status} failed for ${video.id}:`, err);
    return { ok: false, error: msg };
  }
  return { ok: true };
}

/**
 * Director Mode single-step executor (spec §4.1). Runs EXACTLY ONE working-stage
 * body for a director-project video, then stops — one operator press = one
 * stage, no hop loop, no chaining, no gate auto-resolution. This is the only
 * path allowed to advance a director video; `runPipeline` no-ops for them.
 *
 * Money rails apply identically to autonomous mode: the global kill switch, the
 * paused-project check, and the paid-stage budget guard all run before any
 * spend. QC floors do NOT block here — advisory reviews are a separate operator
 * action (D2), and gate arrivals hold rather than advance.
 *
 * Callable only from a working (non-gate) status. At a gate status there is no
 * stage body to run — the operator uses decideGate (Advance) or a D2 stage
 * action instead — so this returns a no-op result.
 */
export async function runDirectedStage(
  videoId: string,
  dbArg?: Db,
): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());
  const project = await projectOfVideo(db, videoId);
  if (!project.ok) return project;
  if (!isDirectorMode(project.project)) {
    return { ok: false, error: "runDirectedStage is Director-Mode only" };
  }
  return advanceStage(videoId, db);
}

async function projectOfVideo(
  db: Db,
  videoId: string,
): Promise<{ ok: true; video: Video; project: Project } | { ok: false; error: string }> {
  const video = await getVideo(db, videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  return { ok: true, video, project };
}

/**
 * ClickMax-transition Phase 1: the single-step advance primitive — one call =
 * one working stage, holding at gates. This is what the workspace "Continue"
 * action and the Director UI both invoke; `runDirectedStage` is a thin
 * director-only wrapper. Money + safety rails identical to autonomous mode.
 */
export async function advanceStage(videoId: string, dbArg?: Db): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());
  const loaded = await projectOfVideo(db, videoId);
  if (!loaded.ok) return loaded;
  const { video, project } = loaded;

  // Money + safety rails (shared with autonomous mode by design).
  if (await isKillSwitchOn(db)) {
    await db.from("videos").update({ paused_reason: "Global kill switch is on" }).eq("id", videoId);
    return { ok: false, error: "Global kill switch is on" };
  }
  if (project.status !== "active") {
    await db.from("videos").update({ paused_reason: "Project is paused" }).eq("id", videoId);
    return { ok: false, error: "Project is paused" };
  }

  // At a gate status there is no stage body — hold for an explicit gate/stage
  // action rather than doing anything implicit.
  if (GATE_FOR_STATUS[video.status]) return { ok: true };

  const paidStage = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"].includes(
    video.status,
  );
  if (paidStage) {
    // Fail-closed money rail (kept in both modes): when a paid asset provider is
    // live but the QC/grading model is not, we'd be paying to generate visuals
    // we cannot judge. Block that spend before the asset stage rather than wave
    // it through (spec §2 principle 3 / §4.1.5).
    if (video.status === "GENERATING_ASSETS") {
      const qg = await getQualityGateConfig(db);
      if (failClosedBlocksSpend(qg)) {
        const reason =
          "Asset generation blocked — a paid image/video provider is live but the QC model has no key, so generated visuals can't be judged. Add ANTHROPIC_API_KEY (or run visuals in mock) to proceed.";
        await db.from("videos").update({ paused_reason: reason }).eq("id", videoId);
        return { ok: false, error: reason };
      }
    }
    const pause = await budgetPause(db, video, project);
    if (pause) {
      await db.from("videos").update({ paused_reason: pause }).eq("id", videoId);
      return { ok: false, error: pause };
    }
    if (video.paused_reason) {
      await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
    }
  }

  const out = await runStageBody(db, video, project, "stage");
  return out.ok ? { ok: true } : { ok: false, error: out.error };
}

/**
 * ClickMax-transition Phase 1 (§5): before a per-asset regeneration replaces a
 * row, copy it into `asset_versions` so the workspace can show take history
 * and pin an earlier version. Stage re-runs keep their delete+insert semantics
 * (assets table = current takes only — 50+ read sites depend on that).
 * Best-effort: a missing history table must never block a regeneration.
 */
async function archiveAssetVersions(
  db: Db,
  videoId: string,
  kind: string,
  beatIndex?: number,
): Promise<void> {
  try {
    let q = db.from("assets").select("*").eq("video_id", videoId).eq("kind", kind);
    if (beatIndex != null) q = q.eq("beat_index", beatIndex);
    const { data } = await q;
    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return;
    await db.from("asset_versions").insert(
      rows.map((r) => ({
        asset_id: r.id ?? null,
        video_id: videoId,
        kind,
        beat_index: r.beat_index ?? null,
        provider: r.provider,
        storage_path: r.storage_path,
        meta: r.meta ?? {},
        cost_usd: r.cost_usd ?? 0,
        archived_at: new Date().toISOString(),
      })),
    );
  } catch (err) {
    console.error("asset_versions archive failed (non-blocking):", err);
  }
}

/**
 * Workspace card action (§4.1): re-synthesize ONE beat's VO as a fresh take.
 * Bypasses the VO cache (same text would otherwise return identical audio),
 * archives the previous take to asset_versions, and ledgers the spend.
 */
export async function regenerateBeatVo(opts: {
  videoId: string;
  beatIdx: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const loaded = await projectOfVideo(db, opts.videoId);
  if (!loaded.ok) return loaded;
  const { video, project } = loaded;

  const script = await loadLatestScript(db, video.id);
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find((b) => b.idx === opts.beatIdx);
  if (!beat) return { ok: false, error: "Beat not found" };

  const guard = await checkBudget(db, project, video, 0.1);
  if (!guard.ok) return { ok: false, error: guard.reason };

  await archiveAssetVersions(db, video.id, "vo", opts.beatIdx);
  const result = await synthesizeBeatVo(db, video, project, beat, undefined, {
    forceNewTake: true,
  });
  if (result.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: result.provider, usd: result.costUsd, description: `VO take, beat ${opts.beatIdx + 1}` },
      `regenerate VO beat ${opts.beatIdx + 1}`,
    );
  }
  return { ok: true };
}

/**
 * AI Avatar (build phase A): render one beat as a talking-presenter shot.
 * The presenter is the project's fixed presenter image (identity by
 * construction); the voice is the beat's EXISTING VO asset — so the avatar
 * is always in sync with the script by definition. Output replaces the
 * beat's clip (archived to asset_versions first) and renders like any clip.
 */
export async function generateBeatAvatar(opts: {
  videoId: string;
  beatIdx: number;
  modelId?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const loaded = await projectOfVideo(db, opts.videoId);
  if (!loaded.ok) return loaded;
  const { video, project } = loaded;

  const model = getAvatarModel(opts.modelId ?? DEFAULT_AVATAR_MODEL_ID);
  if (!model) return { ok: false, error: "Unknown avatar model." };

  const presenterPath = (project as { presenter_image_path?: string | null }).presenter_image_path;
  if (!presenterPath) {
    return {
      ok: false,
      error:
        "No presenter image set for this project — upload one in Project Settings (the same image drives every avatar shot, which is what keeps the character consistent).",
    };
  }

  const { data: vo } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", opts.beatIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!vo?.storage_path) {
    return { ok: false, error: "No VO for this beat yet — the avatar lip-syncs to the beat's voiceover, so generate assets (or the VO) first." };
  }
  const durationSec = Math.max(1, Number((vo.meta as { durationSec?: number })?.durationSec ?? 8));
  if (durationSec > model.maxClipSec) {
    return {
      ok: false,
      error: `This beat's VO runs ${Math.round(durationSec)}s but ${model.label} caps at ${model.maxClipSec}s per clip — split the beat or pick another model.`,
    };
  }

  const est = estimateAvatarCost(model, durationSec);
  const guard = await checkBudget(db, project, video, est);
  if (!guard.ok) return { ok: false, error: guard.reason };

  const [imageUrl, audioUrl] = await Promise.all([
    getSignedMediaUrl(presenterPath),
    getSignedMediaUrl(vo.storage_path),
  ]);

  let row: Record<string, unknown>;
  let cost = 0;
  if (imageUrl && audioUrl) {
    const out = await generateAvatarVideo({ model, imageUrl, audioUrl, durationSec });
    if (out.provider === "fal-avatar") {
      const path = `avatars/${video.id}/beat-${opts.beatIdx}-${Date.now().toString(36)}.mp4`;
      await uploadMedia(path, out.video, "video/mp4");
      cost = out.costUsd;
      row = {
        video_id: video.id,
        kind: "clip",
        provider: "fal-avatar",
        storage_path: path,
        beat_index: opts.beatIdx,
        meta: { isVideo: true, avatar: true, model: model.id, durationSec },
        cost_usd: cost,
      };
    } else {
      row = mockAvatarRow(video.id, opts.beatIdx, model.id, durationSec);
    }
  } else {
    // No storage/signing available (mock deploys) — record the mock shot so
    // the flow still completes end-to-end.
    row = mockAvatarRow(video.id, opts.beatIdx, model.id, durationSec);
  }

  await archiveAssetVersions(db, video.id, "clip", opts.beatIdx);
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert(row);
  if (cost > 0) {
    await recordCost(
      db,
      video,
      { provider: "fal-avatar", usd: cost, description: `${model.label}, beat ${opts.beatIdx + 1}` },
      `avatar beat ${opts.beatIdx + 1}`,
    );
  }
  await postWorkspaceNote(
    db,
    video,
    `Beat ${opts.beatIdx + 1} is now an avatar shot (${model.label}${cost > 0 ? `, $${cost.toFixed(2)}` : ", mock"}).`,
    { event: "avatar_generated", beatIdx: opts.beatIdx, model: model.id },
  );
  return { ok: true };
}

function mockAvatarRow(videoId: string, beatIdx: number, modelId: string, durationSec: number) {
  return {
    video_id: videoId,
    kind: "clip",
    provider: "mock:fal-avatar",
    storage_path: `mock:avatar-${videoId}-${beatIdx}`,
    beat_index: beatIdx,
    meta: { isVideo: true, avatar: true, model: modelId, durationSec },
    cost_usd: 0,
  };
}

/**
 * Avatar edit path (build phase B): after a VO retake, re-lipsync the
 * EXISTING avatar clip to the new audio via sync.so (~$0.04/s) instead of
 * paying for a full regeneration. Falls back with a clear message when the
 * beat has no avatar clip or SYNC_SO_API_KEY isn't set.
 */
export async function resyncBeatAvatar(opts: {
  videoId: string;
  beatIdx: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const loaded = await projectOfVideo(db, opts.videoId);
  if (!loaded.ok) return loaded;
  const { video, project } = loaded;

  const { data: clip } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isAvatar = Boolean((clip?.meta as { avatar?: boolean } | null)?.avatar);
  if (!clip?.storage_path || !isAvatar) {
    return { ok: false, error: "This beat has no avatar clip to re-sync — generate one first (“make this beat an avatar shot”)." };
  }
  const { data: vo } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", opts.beatIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!vo?.storage_path) return { ok: false, error: "No VO for this beat to sync to." };
  const durationSec = Math.max(1, Number((vo.meta as { durationSec?: number })?.durationSec ?? 8));

  if (!isSyncLive()) {
    return {
      ok: false,
      error: "Re-sync needs SYNC_SO_API_KEY (sync.so). Without it, regenerate the avatar shot instead (“redo beat's avatar”).",
    };
  }
  const est = Math.round(SYNC_USD_PER_SEC * durationSec * 100) / 100;
  const guard = await checkBudget(db, project, video, est);
  if (!guard.ok) return { ok: false, error: guard.reason };

  const [videoUrl, audioUrl] = await Promise.all([
    getSignedMediaUrl(clip.storage_path),
    getSignedMediaUrl(vo.storage_path),
  ]);
  if (!videoUrl || !audioUrl) return { ok: false, error: "Could not sign media URLs for re-sync." };

  const out = await resyncLipsync({ videoUrl, audioUrl, durationSec });
  if (out.provider !== "sync.so") {
    return { ok: false, error: "Re-sync unavailable (mock mode)." };
  }
  const path = `avatars/${video.id}/beat-${opts.beatIdx}-resync-${Date.now().toString(36)}.mp4`;
  await uploadMedia(path, out.video, "video/mp4");
  await archiveAssetVersions(db, video.id, "clip", opts.beatIdx);
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: "sync.so",
    storage_path: path,
    beat_index: opts.beatIdx,
    meta: { ...(clip.meta as Record<string, unknown>), durationSec, resynced: true },
    cost_usd: out.costUsd,
  });
  await recordCost(
    db,
    video,
    { provider: "sync.so", usd: out.costUsd, description: `Avatar re-sync, beat ${opts.beatIdx + 1}` },
    `avatar resync beat ${opts.beatIdx + 1}`,
  );
  return { ok: true };
}

/** Idea #3 — reroll a single beat's visual at the Assets gate, optionally
    steered by a note, without re-running the whole stage. */
export async function rerollBeatVisual(opts: {
  videoId: string;
  beatIdx: number;
  note?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const script = await loadLatestScript(db, video.id);
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find(
    (b) => b.idx === opts.beatIdx,
  );
  if (!beat) return { ok: false, error: "Beat not found" };

  const guard = await checkBudget(db, project, video, 0.05);
  if (!guard.ok) return { ok: false, error: guard.reason };

  const steered = opts.note?.trim()
    ? { ...beat, visualPrompt: `${beat.visualPrompt}. ${opts.note.trim()}` }
    : beat;
  const draft = await makeBeatClip(video, project, steered);
  await archiveAssetVersions(db, video.id, "clip", opts.beatIdx);
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert(draft.row);
  await recordCost(db, video, draft.cost, `reroll beat ${opts.beatIdx + 1}`);
  return { ok: true };
}

/**
 * Regenerable workspace (C2): re-roll a SINGLE generated asset from the exact
 * request stored on it (meta.request), without re-running the whole stage.
 * `reproduce` replays the stored seed for a deterministic reproduction; the
 * default mints a fresh seed for a new variation. Logs a `regenerate` decision
 * (#9). Currently covers FLUX stills — the bulk of generated assets and the
 * cheapest to re-roll; video clips regenerate via their per-beat generator.
 */
export async function regenerateAsset(opts: {
  assetId: string;
  reproduce?: boolean;
}): Promise<EngineResult> {
  const db = await createClient();
  const { data: asset } = await db
    .from("assets")
    .select("id, video_id, kind, beat_index, meta")
    .eq("id", opts.assetId)
    .maybeSingle();
  if (!asset) return { ok: false, error: "Asset not found" };
  const req = (asset.meta as { request?: Record<string, unknown> } | null)?.request;
  if (!req || req.kind !== "still") {
    return { ok: false, error: "This asset has no stored still request to regenerate from." };
  }
  const video = await getVideo(db, asset.video_id);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const quality = req.quality === "dev" ? "dev" : "schnell";
  const guard = await checkBudget(db, project, video, quality === "dev" ? 0.03 : 0.006);
  if (!guard.ok) return { ok: false, error: guard.reason };

  const prompt = String(req.prompt ?? "");
  if (!prompt) return { ok: false, error: "Stored request has no prompt." };
  const img = await generateImage({
    prompt,
    quality,
    seed: opts.reproduce ? Number(req.seed) : undefined,
  });
  const path = `videos/${video.id}/beat-${asset.beat_index}-regen.jpg`;
  await uploadMedia(path, img.image, "image/jpeg");
  const phash = await perceptualHash(img.image);

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", asset.beat_index);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: "fal.ai",
    storage_path: path,
    beat_index: asset.beat_index,
    meta: {
      shotType: (asset.meta as { shotType?: string } | null)?.shotType ?? "broll",
      stillImage: true,
      model: `flux/${quality}`,
      regenerated: true,
      ...(phash ? { phash } : {}),
      request: { ...req, seed: img.seed, endpoint: img.endpoint },
    },
    cost_usd: img.costUsd,
  });
  await recordCost(
    db,
    video,
    { provider: "fal.ai", usd: img.costUsd, description: `Regenerate still — section ${Number(asset.beat_index) + 1}` },
    `regenerate beat ${Number(asset.beat_index) + 1}`,
  );
  await recordDecision(db, {
    projectId: video.project_id,
    videoId: video.id,
    beatIdx: asset.beat_index,
    kind: "regenerate",
    choice: `flux/${quality}`,
    confidence: null,
    reasoning: opts.reproduce
      ? "Reproduced the still from its exact stored request (same seed)."
      : "Re-rolled the still from its stored request with a fresh seed.",
    costUsd: img.costUsd,
    params: { ...req, seed: img.seed },
  });
  return { ok: true };
}

// ── Stick Studio: per-beat scene editing (Phase 3) ────────────────────
// The stick "visual" for a beat is its choreographed StickScene, stored on the
// beat's clip asset (meta.stickScene). Re-roll re-choreographs one beat; the
// manual setter overrides action/setting/mood directly.

async function loadStickClip(
  db: Db,
  videoId: string,
  beatIdx: number,
): Promise<{ id: string; meta: Record<string, unknown> } | null> {
  const { data } = await db
    .from("assets")
    .select("id, meta")
    .eq("video_id", videoId)
    .eq("kind", "clip")
    .eq("beat_index", beatIdx)
    .maybeSingle();
  return data ? { id: data.id as string, meta: (data.meta ?? {}) as Record<string, unknown> } : null;
}

/** Re-choreograph one beat's stick scene (optionally steered by a note). */
export async function rerollStickScene(opts: {
  videoId: string;
  beatIdx: number;
  note?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find((b) => b.idx === opts.beatIdx);
  if (!beat) return { ok: false, error: "Beat not found" };

  const steered = opts.note?.trim() ? { ...beat, text: `${beat.text} (${opts.note.trim()})` } : beat;
  const choreo = await choreographStickScenes({
    title: video.title,
    niche: project.niche,
    topic: video.topic,
    tone: project.tone,
    format: video.format,
    beats: [steered],
  });
  const scene = choreo.scenes[0];
  if (!scene) return { ok: false, error: "Choreographer returned no scene" };

  const clip = await loadStickClip(db, video.id, opts.beatIdx);
  if (clip) {
    await db.from("assets").update({ meta: { ...clip.meta, stickScene: scene } }).eq("id", clip.id);
  } else {
    await db.from("assets").insert({
      video_id: video.id,
      kind: "clip",
      provider: "stick",
      storage_path: "",
      beat_index: opts.beatIdx,
      meta: { shotType: beat.shotType, stickScene: scene },
      cost_usd: 0,
    });
  }
  if (choreo.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: "anthropic", usd: choreo.costUsd, description: "Stick scene re-roll" },
      `beat ${opts.beatIdx + 1}`,
    );
  }
  return { ok: true };
}

/** Operator override of one beat's stick scene (action / setting / mood). */
export async function setStickScene(opts: {
  videoId: string;
  beatIdx: number;
  action?: string;
  setting?: string;
  mood?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const clip = await loadStickClip(db, opts.videoId, opts.beatIdx);
  if (!clip) return { ok: false, error: "Generate assets first — this beat has no stick scene yet." };
  const scene = clip.meta.stickScene as StickScene | undefined;
  if (!scene) return { ok: false, error: "This beat has no stick scene." };

  const next: StickScene = { ...scene };
  if (opts.setting) next.setting = opts.setting as StickScene["setting"];
  if (opts.mood) next.mood = opts.mood === "none" ? undefined : (opts.mood as StickScene["mood"]);
  if (opts.action && scene.actors.length > 0) {
    next.actors = scene.actors.map((a, i) =>
      i === 0 ? { ...a, action: opts.action as (typeof a)["action"] } : a,
    );
  }
  await db.from("assets").update({ meta: { ...clip.meta, stickScene: next } }).eq("id", clip.id);
  return { ok: true };
}

/** Regenerate the script from scratch (e.g. a script row landed with zero
    beats and the generation UI has nothing to work with). Writes a fresh
    script version and lands back at the Script gate. */
export async function regenerateScript(opts: { videoId: string }): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  await runScripting(db, video, project); // → fresh script version, SCRIPT_READY
  await markDownstreamAssetsStale(db, video.id);
  return { ok: true };
}

/**
 * ClickMax-transition §4.1 stale cascade: a script rewrite invalidates the
 * VO/visuals generated from the OLD beats, but never auto-regenerates them —
 * the workspace shows "stale" on those cards and the user (or a confirmed
 * chat batch) pays per refresh. Best-effort until migration 0069 adds the
 * column everywhere.
 */
async function markDownstreamAssetsStale(db: Db, videoId: string): Promise<void> {
  try {
    await db
      .from("assets")
      .update({ stale: true })
      .eq("video_id", videoId)
      .in("kind", ["vo", "clip", "captions"]);
  } catch (err) {
    console.error("stale-marking failed (non-blocking):", err);
  }
}

// ── Beat shot-type (hero / broll / stock) ─────────────────────────────
// shotType is metadata (it doesn't change VO), so we update the latest
// script row in place rather than spawning a new version.

export async function setBeatShotType(opts: {
  videoId: string;
  beatIdx: number;
  shotType: ScriptBeat["shotType"];
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).map((b) =>
    b.idx === opts.beatIdx ? { ...b, shotType: opts.shotType } : b,
  );
  await db.from("scripts").update({ beats }).eq("id", script.id);
  return { ok: true };
}

export type ClassifyResult =
  | { ok: true; shots: { idx: number; shotType: ScriptBeat["shotType"] }[] }
  | { ok: false; error: string };

export async function autoClassifyShotTypes(
  opts: { videoId: string },
  dbArg?: Db,
): Promise<ClassifyResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to classify" };

  const beats = script.beats as ScriptBeat[];
  const { classifications, costUsd } = await classifyShotTypes({
    niche: project.niche,
    beats: beats.map((b) => ({ idx: b.idx, text: b.text, visualPrompt: b.visualPrompt })),
  });
  const map = new Map(classifications.map((c) => [c.idx, c.shotType]));
  const updated = beats.map((b) => ({ ...b, shotType: map.get(b.idx) ?? b.shotType }));
  await db.from("scripts").update({ beats: updated }).eq("id", script.id);
  if (costUsd > 0) {
    await recordCost(db, video, { provider: "anthropic", usd: costUsd, description: "Auto-classify shot types" });
  }
  return { ok: true, shots: classifications };
}

// ── Section (beat) editing — add / delete / move / merge ──────────────
// Beats live in the latest script's `beats` jsonb; edits update it in place
// and re-index. Visual-only sections carry empty narration (skipped by VO).

function reindex(beats: ScriptBeat[]): ScriptBeat[] {
  return beats.map((b, i) => ({ ...b, idx: i }));
}

async function saveBeats(db: Db, scriptId: string, beats: ScriptBeat[]) {
  await db.from("scripts").update({ beats: reindex(beats) }).eq("id", scriptId);
}

export async function addBeat(opts: {
  videoId: string;
  afterIdx: number;
  beat: { text: string; visualPrompt: string; shotType: ScriptBeat["shotType"] };
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).slice();
  const pos = Math.min(Math.max(opts.afterIdx + 1, 0), beats.length);
  beats.splice(pos, 0, { idx: pos, ...opts.beat });
  await saveBeats(db, script.id, beats);
  return { ok: true };
}

export async function deleteBeat(opts: { videoId: string; beatIdx: number }): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).filter((b) => b.idx !== opts.beatIdx);
  if (beats.length === 0) return { ok: false, error: "A video needs at least one section" };
  await saveBeats(db, script.id, beats);
  // Drop any assets tied to the removed section.
  await db.from("assets").delete().eq("video_id", opts.videoId).eq("beat_index", opts.beatIdx);
  return { ok: true };
}

export async function moveBeat(opts: {
  videoId: string;
  beatIdx: number;
  dir: "up" | "down";
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).slice().sort((a, b) => a.idx - b.idx);
  const i = beats.findIndex((b) => b.idx === opts.beatIdx);
  const j = opts.dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= beats.length) return { ok: true }; // edge — no-op
  [beats[i], beats[j]] = [beats[j], beats[i]];
  await saveBeats(db, script.id, beats);
  return { ok: true };
}

/** Merge sections start..end into one (concatenated narration, first beat's
    visual direction). Used by the auto-stitch "merge sections" flow. */
export async function mergeBeats(opts: {
  videoId: string;
  startIdx: number;
  endIdx: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const lo = Math.min(opts.startIdx, opts.endIdx);
  const hi = Math.max(opts.startIdx, opts.endIdx);
  const beats = (script.beats as ScriptBeat[]).slice().sort((a, b) => a.idx - b.idx);
  if (lo < 0 || hi >= beats.length || hi <= lo) return { ok: false, error: "Pick a valid section range" };
  const span = beats.slice(lo, hi + 1);
  const merged: ScriptBeat = {
    idx: lo,
    text: span.map((b) => b.text).filter(Boolean).join(" "),
    visualPrompt: span[0].visualPrompt,
    shotType: span[0].shotType,
  };
  const next = [...beats.slice(0, lo), merged, ...beats.slice(hi + 1)];
  await saveBeats(db, script.id, next);
  // Old per-section assets in the merged range are now stale.
  for (let k = lo; k <= hi; k++) {
    await db.from("assets").delete().eq("video_id", opts.videoId).eq("beat_index", k);
  }
  return { ok: true };
}

// ── Long-clip jobs (Veo-extend / auto-stitch) → background worker ──────

export type EnqueueResult = { ok: true; jobId: string } | { ok: false; error: string };

export async function enqueueLongClip(opts: {
  videoId: string;
  beatIdx: number;
  method: "veo-extend" | "stitch" | "stitch-seamless";
  model: string;
  targetSec: number;
  estCostUsd: number;
  heroHold?: boolean;
}): Promise<EnqueueResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const spent = await monthVideoSpend(db);
  if (spent + opts.estCostUsd > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `Monthly video budget reached ($${VIDEO_MONTHLY_CAP_USD}). $${spent.toFixed(2)} used; this clip needs ~$${opts.estCostUsd.toFixed(2)}.`,
    };
  }
  const { data, error } = await db
    .from("clip_jobs")
    .insert({
      video_id: opts.videoId,
      project_id: video.project_id,
      beat_idx: opts.beatIdx,
      method: opts.method,
      model: opts.model,
      target_sec: opts.targetSec,
      hero_hold: Boolean(opts.heroHold),
      status: "queued",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not queue clip" };
  return { ok: true, jobId: data.id as string };
}

// ── Full Auto-Generate — one tap → whole video, pause at Final ────────

export type FullAutoResult =
  | { ok: true; enqueued: number; estCostUsd: number }
  | { ok: false; error: string };

/** Art-director pass: refine the latest script's per-beat visual prompts +
    assign camera motion, in place. Best-effort; cost billed to the video. */
async function directArt(db: Db, video: Video, project: Project): Promise<void> {
  const script = await loadLatestScript(db, video.id);
  const beats = ((script?.beats ?? []) as ScriptBeat[]) ?? [];
  if (!script || beats.length === 0) return;
  const plan = await directShots({
    title: video.title,
    niche: project.niche,
    topic: video.topic,
    tone: project.tone,
    format: video.format,
    beats,
    // Tier 3: steer the first render with what the auto-fix loop already learned.
    playbook: project.autofix_memory?.playbook,
    antiPatterns: project.autofix_memory?.antiPatterns,
  });
  const next = beats.map((b) => {
    const s = plan.shots.get(b.idx);
    return s
      ? { ...b, visualPrompt: s.visualPrompt || b.visualPrompt, shotType: s.shotType ?? b.shotType, motion: s.motion }
      : b;
  });
  await db.from("scripts").update({ beats: next }).eq("id", (script as { id: string }).id);
  if (plan.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: "anthropic", usd: plan.costUsd, description: "Art-director shot plan" },
      `“${video.title}”`,
    );
  }
}

export async function fullAutoGenerate(
  opts: {
    videoId: string;
    tier: AutoTier;
    /** Custom-tier recipe (models + lengths + price cap). Ignored otherwise. */
    custom?: CustomSpec;
  },
  dbArg?: Db,
): Promise<FullAutoResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (video.status !== "SCRIPT_READY") {
    return { ok: false, error: "Full Auto runs from the Script gate — approve later stages manually." };
  }

  // 1) Classify shot types so the smart mix targets the right sections.
  await autoClassifyShotTypes({ videoId: opts.videoId }, db);

  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  // Fail-closed (Tier 3): for footage projects, if the paid image/video provider
  // is live but the QC model is mocked, pause rather than pay for generation we
  // can't quality-check. No effect when ANTHROPIC_API_KEY is set.
  //
  // Stick exemption (audited, Phase 4.5): the guard's condition is
  // isFalLive() && !isQcLive(). Stick renders are programmatic (no fal
  // image/video spend), and their choreography runs on the same Anthropic key
  // as QC — so when choreography is live, QC is live too. The only paid stick
  // dependency is VO, which no vision QC could judge either way.
  if (project.visual_style !== "stick") {
    const qg = await getQualityGateConfig(db);
    if (failClosedBlocksSpend(qg)) {
      await db
        .from("videos")
        .update({
          paused_reason:
            "Held — asset providers are live but the QC model is unavailable (fail-closed). Set ANTHROPIC_API_KEY to resume paid generation.",
        })
        .eq("id", opts.videoId);
      return { ok: false, error: "Quality gate: QC model unavailable while paid providers are live — paused to avoid un-QC'd spend." };
    }
  }

  // 1b) Art-director pass (concept #2/#3): refine each beat's visual prompt for
  // quality + beat-match and assign a per-beat camera motion BEFORE any asset is
  // generated — better first renders (fewer re-rolls) and motion on cheap stills.
  // Footage only — stick visuals are choreographed separately.
  if (project.visual_style !== "stick") {
    try {
      await directArt(db, video, project);
    } catch (err) {
      console.error("art-director pass failed (non-fatal):", err);
    }
  }
  const script = await loadLatestScript(db, opts.videoId);
  const beats = (script?.beats ?? []) as ScriptBeat[];
  const voDur = await voDurations(db, opts.videoId);
  const secFor = (b: ScriptBeat) =>
    voDur.get(b.idx) || Math.max(4, b.text.trim().split(/\s+/).length / 2.5);

  // Stick Studio: no AI-clip tiers/budget — the asset stage choreographs a stick
  // scene per beat. Keep highlights on, then walk the Script + Assets gates so
  // the video lands at render (ASSEMBLING) like the non-stick auto path.
  if (project.visual_style === "stick") {
    if (!video.enable_highlights) {
      try {
        await db.from("videos").update({ enable_highlights: true }).eq("id", opts.videoId);
        video.enable_highlights = true;
        await runHighlightCuration(db, video, project, beats);
      } catch (err) {
        console.error("full-auto highlight curation failed:", err);
      }
    }
    await db.from("videos").update({ auto_finish: true }).eq("id", opts.videoId);
    await decideGate({ videoId: opts.videoId, decision: "approved" }, db); // Script → assets
    await decideGate({ videoId: opts.videoId, decision: "approved" }, db); // Assets → render
    return { ok: true, enqueued: 0, estCostUsd: 0 };
  }

  // 2) Plan which beats get AI video: hero bookends + length-scaled b-roll,
  //    packed under the per-video budget. Un-picked beats keep their free
  //    still/stock. Economy honours the project's ai_clip_cap; Custom uses its
  //    own models + price cap (and pauses rather than downgrading on overrun).
  const custom = opts.tier === "custom" ? opts.custom : undefined;
  if (opts.tier === "custom" && !custom) {
    return { ok: false, error: "Custom tier needs a model recipe (hero, b-roll, lengths, price cap)." };
  }
  const maxUsd = custom ? custom.maxUsd : Number(project.max_video_usd ?? 8);
  const selection = selectClipBeats(
    opts.tier,
    beats.map((b) => ({ idx: b.idx, shotType: b.shotType, scriptSec: secFor(b) })),
    {
      clipCap: opts.tier === "economy" ? Number(project.ai_clip_cap ?? 3) : undefined,
      maxUsd,
      custom,
      // Native Shorts animate densely (motion the whole way through).
      shortMode: video.kind === "short",
    },
  );
  // Custom pauses (does not silently downgrade) when the plan exceeds the cap.
  if (custom && selection.overBudget) {
    return {
      ok: false,
      error: `Your selections (~$${selection.requestedUsd.toFixed(2)}) exceed the $${maxUsd.toFixed(2)} price cap. Raise the cap, or pick cheaper models / shorter clips.`,
    };
  }
  const { clips, totalUsd: estCostUsd } = selection;
  const spent = await monthVideoSpend(db);
  if (spent + estCostUsd > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `This run (~$${estCostUsd.toFixed(2)}) would exceed the $${VIDEO_MONTHLY_CAP_USD}/mo cap ($${spent.toFixed(2)} used).`,
    };
  }

  // Default kinetic highlights ON for auto-generated videos (the operator can
  // still edit/clear them in the highlights editor). Curate now from the
  // script — timing is resolved from the VO word timings at render. Skip if the
  // operator already enabled them (runScripting curated at the Script gate),
  // and never block the run on it.
  if (!video.enable_highlights) {
    try {
      await db.from("videos").update({ enable_highlights: true }).eq("id", opts.videoId);
      video.enable_highlights = true;
      await runHighlightCuration(db, video, project, beats);
    } catch (err) {
      console.error("full-auto highlight curation failed:", err);
    }
  }

  // 3) Mark auto-finish FIRST so the Assets gate holds (arriveAtGate sees it)
  //    while clips generate — the worker advances to render once they land.
  //    Director tier (Phase E) ALSO stamps director_cut: the clip worker's
  //    maybeFinish routes this video to an agent cut session regardless of the
  //    project-level mvda_enabled flag.
  await db
    .from("videos")
    .update({ auto_finish: true, ...(opts.tier === "director" ? { director_cut: true } : {}) })
    .eq("id", opts.videoId);

  // 4) Approve the script gate → runs VO + stock + base stills → ASSETS_READY.
  await decideGate({ videoId: opts.videoId, decision: "approved" }, db);

  // 5) Enqueue clip jobs for the selected beats. Batch-insert (not one-by-one)
  //    so the clip worker can't claim+finish the first job and advance the
  //    video to render before the rest are queued.
  if (clips.length === 0) {
    // No AI clips to wait on — nothing will ever trigger the worker's
    // maybeFinish, so the video would strand at ASSETS_READY forever (Base tier,
    // all-stock scripts, or budget-packed-to-empty). MVDA channels and Director
    // videos hand off to the agent cut session here (same fork as maybeFinish,
    // conflict #2); everyone else advances to render now.
    if (project.mvda_enabled || opts.tier === "director") {
      await db
        .from("videos")
        .update({ edit_session_requested: true, auto_finish: false })
        .eq("id", opts.videoId);
    } else {
      await db.from("videos").update({ auto_finish: false }).eq("id", opts.videoId);
      await decideGate({ videoId: opts.videoId, decision: "approved" }, db); // ASSETS → ASSEMBLING
    }
  } else {
    // Seed-still vision gate (Tier 4 #1): vet each selected seed and re-roll a
    // weak one BEFORE queuing the paid video job that would animate it.
    for (const c of clips) {
      const beat = beats.find((b) => b.idx === c.idx);
      if (beat) await vetSeedStillForBeat(db, video, project, beat);
    }
    // Scored provider selection (#1): the tier picked a default model per beat;
    // now score the tier's candidate pool per beat (task-fit / quality / control
    // / reliability / cost / latency / continuity) and enqueue the WINNER, with
    // the full rationale + alternatives logged to clip_jobs.selection. Heroes
    // come first in `clips`, so the first pick sets the family the rest prefer
    // (continuity), and a per-beat budget keeps the scored plan within the cap.
    const health: ModelHealth = await videoModelHealth(db);
    let remainingUsd = maxUsd;
    let preferredFamily: string | undefined;
    const rows = clips.map((c) => {
      const choice = selectBeatModel({
        tier: opts.tier,
        shot: c.shotType === "hero" ? "hero" : "broll",
        targetSec: c.job.targetSec,
        budgetRemainingUsd: remainingUsd,
        fallbackModel: c.job.model,
        preferredFamily,
        needsAudio: c.shotType === "hero" && opts.tier !== "economy",
        custom,
        health,
      });
      remainingUsd = Math.max(0, remainingUsd - choice.selection.estCostUsd);
      preferredFamily ??= choice.family;
      return {
        video_id: opts.videoId,
        project_id: video.project_id,
        beat_idx: c.idx,
        method: "stitch" as const,
        model: choice.modelId,
        target_sec: choice.targetSec,
        hero_hold: c.job.heroHold,
        status: "queued" as const,
        selection: choice.selection,
      };
    });
    await db.from("clip_jobs").insert(rows);
    // Decision audit trail (#9): log each beat's scored model pick — choice,
    // alternatives, confidence, reasoning, cost + the exact request params (C2).
    await recordDecisions(
      db,
      rows.map((r) => {
        const sel = r.selection;
        return {
          projectId: video.project_id,
          videoId: opts.videoId,
          beatIdx: r.beat_idx,
          kind: "model" as const,
          choice: sel.model,
          alternatives: sel.alternatives.map((a) => ({
            id: a.id,
            label: a.label,
            score: a.total,
            costUsd: a.estCostUsd,
          })),
          confidence: sel.score,
          reasoning: sel.rationale,
          costUsd: sel.estCostUsd,
          params: {
            model: r.model,
            targetSec: r.target_sec,
            method: r.method,
            heroHold: r.hero_hold,
            tier: opts.tier,
            dims: sel.dims,
            weights: sel.weights,
            operatorLocked: sel.operatorLocked ?? false,
          },
        };
      }),
    );
  }
  return { ok: true, enqueued: clips.length, estCostUsd };
}

// ── Full-Auto Build & Post (Phase 0) ──────────────────────────────────
// See docs/Full-Auto-Build-and-Posting-plan.md. P0 = the run record + seed
// videos + the build-runner unit of work. Scheduling, QC-gated auto-approval,
// and auto-publish arrive in later phases (videos land at FINAL_REVIEW for now).

export type BuildRunConfig = {
  count: number;
  kind: "long" | "short";
  lengthMinSec: number;
  lengthMaxSec: number;
  tier: AutoTier;
  custom?: CustomSpec;
  thumbStyle: string;
  ideaSource: "existing" | "research";
  ideaIds?: string[];
  scheduleMode?: "all_at_once" | "multi_day" | "staggered";
  scheduleCfg?: Record<string, unknown>;
};

/** Snap a target length into range — Shorts snap to an offered length. */
function sampleLength(kind: "long" | "short", lo: number, hi: number): number {
  const raw = Math.round(lo + Math.random() * Math.max(0, hi - lo));
  if (kind === "short") {
    const offered = SHORT_LENGTHS as readonly number[];
    const inRange = offered.filter((s) => s >= lo - 5 && s <= hi + 5);
    const pool = inRange.length ? inRange : offered;
    return pool.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best), pool[0]);
  }
  return Math.max(30, raw);
}

// ── Publish scheduling (Phase 2) ──────────────────────────────────────
// Slots are computed as absolute UTC from a wall-clock time in America/Chicago,
// so DST (CDT/CST) is resolved once, at scheduling time — no drift, no double-
// posts. Stored on each video as scheduled_publish_at; the scheduler releases a
// video (sets publish_requested) once its slot is due (or immediately, for
// all-at-once). The render farm's publishStagedVideos then uploads it.

const POST_TZ = "America/Chicago";

/** Per-day posting times by videos-per-day (P2). Hour/minute in CT. */
const STAGGER_TIMES: Record<number, [number, number][]> = {
  1: [[14, 0]],
  2: [[10, 0], [14, 0]],
  3: [[9, 0], [13, 0], [18, 0]],
};

/** Offset (ms) of a time zone from UTC at a given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  // 'hour' can format midnight as 24 — normalize so Date.UTC stays in range.
  const hour = m.hour === "24" ? 0 : Number(m.hour);
  const asUtc = Date.UTC(
    Number(m.year),
    Number(m.month) - 1,
    Number(m.day),
    hour,
    Number(m.minute),
    Number(m.second),
  );
  return asUtc - utcMs;
}

/** The UTC instant for a wall-clock time on a given Y/M/D in a time zone. */
export function zonedTimeToUtc(
  year: number,
  monthIdx: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, monthIdx, day, hour, minute, 0);
  // Correct by the offset, re-checking at the corrected instant so a slot that
  // straddles a DST transition resolves to the right wall-clock time.
  let utc = guess - tzOffsetMs(guess, tz);
  const refined = guess - tzOffsetMs(utc, tz);
  if (refined !== utc) utc = refined;
  return new Date(utc);
}

/** The Y/M/D in the posting time zone for a given instant. */
export function ymdInTz(d: Date, tz: string): { y: number; m: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return { y: Number(m.year), m: Number(m.month), day: Number(m.day) };
}

/**
 * Assign each of `count` videos an absolute UTC release time.
 *  • all_at_once → all null (release as soon as APPROVED).
 *  • multi_day   → one/day at 2 PM CT, starting the next 2 PM CT.
 *  • staggered   → perDay slots/day at fixed CT times (P2), rolling forward.
 * Past-due slots are skipped so nothing is scheduled into the past.
 */
function computeSchedule(
  count: number,
  mode: "all_at_once" | "multi_day" | "staggered",
  cfg: Record<string, unknown>,
  now: Date,
): (string | null)[] {
  if (mode === "all_at_once") return Array(count).fill(null);

  const perDay = mode === "multi_day" ? 1 : Math.max(1, Math.min(3, Number(cfg.perDay ?? 2)));
  const times = STAGGER_TIMES[perDay] ?? STAGGER_TIMES[1];

  const slots: string[] = [];
  const base = ymdInTz(now, POST_TZ);
  for (let dayOffset = 0; slots.length < count && dayOffset < 366; dayOffset++) {
    for (const [h, min] of times) {
      // Anchor off the base date, letting zonedTimeToUtc normalize overflow.
      const dt = zonedTimeToUtc(base.y, base.m - 1, base.day + dayOffset, h, min, POST_TZ);
      if (dt.getTime() > now.getTime()) {
        slots.push(dt.toISOString());
        if (slots.length >= count) break;
      }
    }
  }
  return slots;
}

// ── Budget pre-flight (Phase 3) ───────────────────────────────────────

/** A synthetic beat breakdown for a not-yet-written video of `lengthSec`: one
    beat per ~20s, all eligible (non-stock) so the estimate reflects the most a
    tier would place — an honest upper bound on what Full-Auto would queue. */
function syntheticBeats(lengthSec: number): { shotType: string; scriptSec: number }[] {
  const n = Math.max(1, Math.round(lengthSec / 20));
  const each = lengthSec / n;
  return Array.from({ length: n }, () => ({ shotType: "broll", scriptSec: each }));
}

/** Rough non-clip production cost (script + VO) for a video of `lengthSec`.
    Stills/script are cents; VO scales with narration. A transparent add-on so
    the displayed total isn't clip-only (the cap itself meters clip spend). */
function nonClipCostUsd(lengthSec: number): number {
  const vo = lengthSec * 0.0045; // ElevenLabs ≈ 15 chars/s @ ~$0.30/1k chars
  const script = 0.03; // one Claude script draft
  return Math.round((vo + script) * 100) / 100;
}

export type BuildCostEstimate = {
  perVideoUsd: number;
  batchUsd: number;
  perVideoClipUsd: number;
  batchClipUsd: number;
  monthVideoSpendUsd: number;
  capUsd: number;
  capRemainingUsd: number;
  overCap: boolean;
};

/** Estimate a Build & Post run's cost before launch. The cap check meters the
    AI-video (fal) spend only — that is the capped resource — while the shown
    totals include the modest non-clip add-on. */
export async function estimateBuildCost(
  project: Project,
  cfg: BuildRunConfig,
  dbArg?: Db,
): Promise<BuildCostEstimate> {
  const db = dbArg ?? (await createClient());
  const count = Math.max(1, Math.min(6, Math.round(cfg.count)));
  const lo = Math.max(15, Math.min(cfg.lengthMinSec, cfg.lengthMaxSec));
  const hi = Math.max(lo, cfg.lengthMaxSec);
  const midSec = Math.round((lo + hi) / 2);
  const beats = syntheticBeats(midSec);
  const maxUsd = cfg.custom ? cfg.custom.maxUsd : Number(project.max_video_usd ?? 8);
  const perVideoClipUsd = estimateTierCost(cfg.tier, beats, {
    clipCap: cfg.tier === "economy" ? Number(project.ai_clip_cap ?? 3) : undefined,
    maxUsd,
    custom: cfg.custom,
    shortMode: cfg.kind === "short",
  });
  const perVideoUsd = Math.round((perVideoClipUsd + nonClipCostUsd(midSec)) * 100) / 100;
  const batchClipUsd = Math.round(perVideoClipUsd * count * 100) / 100;
  const batchUsd = Math.round(perVideoUsd * count * 100) / 100;
  const monthVideoSpendUsd = Math.round((await monthVideoSpend(db)) * 100) / 100;
  const capRemainingUsd =
    Math.round((VIDEO_MONTHLY_CAP_USD - monthVideoSpendUsd) * 100) / 100;
  return {
    perVideoUsd,
    batchUsd,
    perVideoClipUsd,
    batchClipUsd,
    monthVideoSpendUsd,
    capUsd: VIDEO_MONTHLY_CAP_USD,
    capRemainingUsd,
    overCap: batchClipUsd > capRemainingUsd,
  };
}

// ── Performance-aware selection (Phase 5) ─────────────────────────────

/** Published videos with ≥1 stats snapshot needed before performance bias
    activates (P7); below it, fall back to QC + niche heuristics. */
// Cold-start minimum lives in quality-gates config (coldStartMin).

export type ChannelPlaybook = {
  coldStart: boolean;
  publishedWithStats: number;
  /** Keywords from the channel's top performers (lowercased, deduped). */
  topKeywords: string[];
  /** Format that clearly outperforms on this channel (else null). */
  suggestKind: "long" | "short" | null;
  note: string;
};

// One tokenizer for playbook ranking + dedup (Phase 7): dedup.ts's keywords().
const keywordsOf = (text: string): string[] => keywords(text, 4);

/** Build a small per-project "playbook" from published performance. Below the
    cold-start threshold it returns coldStart=true so callers fall back to
    QC/heuristics. Used to rank researched ideas and nudge modal defaults. */
export async function channelPlaybook(db: Db, projectId: string): Promise<ChannelPlaybook> {
  const cold = (n: number, note: string): ChannelPlaybook => ({
    coldStart: true,
    publishedWithStats: n,
    topKeywords: [],
    suggestKind: null,
    note,
  });

  const { data: published } = await db
    .from("videos")
    .select("id, title, topic, kind")
    .eq("project_id", projectId)
    .not("youtube_video_id", "is", null);
  const vids = (published ?? []) as { id: string; title: string; topic: string; kind: string }[];
  if (vids.length === 0) {
    return cold(0, "Cold start — no published videos yet; using QC + niche heuristics.");
  }

  const ids = vids.map((v) => v.id);
  const { data: snaps } = await db
    .from("analytics_snapshots")
    .select("video_id, views, captured_at")
    .in("video_id", ids)
    .order("captured_at", { ascending: false });
  const views = new Map<string, number>();
  for (const s of (snaps ?? []) as { video_id: string; views: number }[]) {
    if (!views.has(s.video_id)) views.set(s.video_id, Number(s.views ?? 0));
  }
  const withStats = vids.filter((v) => views.has(v.id));
  const { coldStartMin } = await getQualityGateConfig(db);
  if (withStats.length < coldStartMin) {
    return cold(
      withStats.length,
      `Cold start — ${withStats.length}/${coldStartMin} published videos have stats; using QC + niche heuristics.`,
    );
  }

  // Winners = the top third by views (min 3).
  const ranked = [...withStats].sort((a, z) => views.get(z.id)! - views.get(a.id)!);
  const winners = ranked.slice(0, Math.max(3, Math.round(ranked.length / 3)));
  const freq = new Map<string, number>();
  for (const v of winners) {
    for (const w of [...keywordsOf(v.title), ...keywordsOf(v.topic)]) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  const topKeywords = [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, z) => z[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);

  // Format bias: compare mean views long vs short when both exist.
  const meanViews = (k: string): number | null => {
    const g = withStats.filter((v) => v.kind === k);
    return g.length ? g.reduce((s, v) => s + views.get(v.id)!, 0) / g.length : null;
  };
  const long = meanViews("long");
  const short = meanViews("short");
  let suggestKind: "long" | "short" | null = null;
  if (long != null && short != null) {
    suggestKind = short > long * 1.25 ? "short" : long > short * 1.25 ? "long" : null;
  }

  return {
    coldStart: false,
    publishedWithStats: withStats.length,
    topKeywords,
    suggestKind,
    note: topKeywords.length
      ? `Performance bias active — leaning into your top topics: ${topKeywords.slice(0, 5).join(", ")}.`
      : "Performance bias active.",
  };
}

/** Score an idea by keyword overlap with the channel's winners (Phase 5). */
function ideaPerfScore(idea: { title: string; topic: string }, topKeywords: string[]): number {
  if (topKeywords.length === 0) return 0;
  const set = new Set([...keywordsOf(idea.title), ...keywordsOf(idea.topic)]);
  let s = 0;
  for (const k of topKeywords) if (set.has(k)) s++;
  return s;
}

/** Run ids that are paused or cancelled — the runner/scheduler skip their
    videos so a paused/cancelled run stops advancing (P10). */
async function blockedRunIds(db: Db): Promise<Set<string>> {
  const { data } = await db
    .from("build_runs")
    .select("id")
    .in("status", ["paused", "cancelled"]);
  return new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
}

/**
 * Launch a Build & Post run: create the run record and one seed video per idea
 * (cheap inserts at IDEA_APPROVED). The build-runner cron then drives each
 * through script → Full Auto-Generate → render. No long work happens here.
 */
export async function startBuildRun(
  projectId: string,
  cfg: BuildRunConfig,
  dbArg?: Db,
): Promise<{ ok: true; runId: string; created: number } | { ok: false; error: string }> {
  const db = dbArg ?? (await createClient());
  const project = await getProject(db, projectId);
  if (!project) return { ok: false, error: "Project not found" };
  // Director Mode: Build & Post (batch autonomous production) is not available.
  // The operator directs one video at a time via the Director Console.
  if (isDirectorMode(project)) {
    return { ok: false, error: "Build & Post is unavailable in Director Mode — direct videos individually from the Console." };
  }

  const count = Math.max(1, Math.min(6, Math.round(cfg.count)));
  const lo = Math.max(15, Math.min(cfg.lengthMinSec, cfg.lengthMaxSec));
  const hi = Math.max(lo, cfg.lengthMaxSec);

  // Budget pre-flight (Phase 3): refuse a run that would blow the monthly cap.
  const estimate = await estimateBuildCost(project, cfg, db);
  if (estimate.overCap) {
    return {
      ok: false,
      error: `This run (~$${estimate.batchClipUsd.toFixed(2)} AI-video) would exceed the $${estimate.capUsd}/mo cap — $${estimate.capRemainingUsd.toFixed(2)} remains. Lower the tier, the count, or the length.`,
    };
  }

  // 1) Source ideas — existing selections or freshly researched.
  let ideas: { id: string | null; title: string; topic: string }[] = [];
  if (cfg.ideaSource === "research") {
    await runIntelligence(projectId, { targetLengthSec: Math.round((lo + hi) / 2) });
    const [{ data: fresh }, { data: used }, playbook] = await Promise.all([
      db.from("ideas").select("id, title, angle").eq("project_id", projectId)
        .order("created_at", { ascending: false }).limit(count * 3),
      db.from("videos").select("idea_id").eq("project_id", projectId).not("idea_id", "is", null),
      channelPlaybook(db, projectId),
    ]);
    const usedSet = new Set(((used ?? []) as { idea_id: string }[]).map((u) => u.idea_id));
    const candidates = ((fresh ?? []) as { id: string; title: string; angle: string }[])
      .filter((i) => !usedSet.has(i.id))
      .map((i) => ({ id: i.id, title: i.title, topic: i.angle || i.title }));
    // Performance-aware ranking (Phase 5): once past cold start, prefer ideas
    // that echo the channel's winning topics; ties keep recency order.
    if (!playbook.coldStart && playbook.topKeywords.length > 0) {
      candidates.sort(
        (a, z) =>
          ideaPerfScore(z, playbook.topKeywords) - ideaPerfScore(a, playbook.topKeywords),
      );
    }
    ideas = candidates.slice(0, count);
  } else {
    const ids = (cfg.ideaIds ?? []).slice(0, count);
    if (ids.length === 0) return { ok: false, error: "Select at least one idea, or choose Research." };
    const { data } = await db.from("ideas").select("id, title, angle").in("id", ids);
    ideas = ((data ?? []) as { id: string; title: string; angle: string }[])
      .map((i) => ({ id: i.id, title: i.title, topic: i.angle || i.title }));
  }
  if (ideas.length === 0) {
    return { ok: false, error: "No ideas available to build — generate or select ideas first." };
  }

  // 2) Create the run record.
  const { data: run, error: runErr } = await db
    .from("build_runs")
    .insert({
      project_id: projectId,
      status: "generating",
      count: ideas.length,
      kind: cfg.kind,
      length_min_sec: lo,
      length_max_sec: hi,
      tier: cfg.tier,
      custom_spec: cfg.custom ?? null,
      thumb_style: cfg.thumbStyle,
      schedule_mode: cfg.scheduleMode ?? "all_at_once",
      schedule_cfg: cfg.scheduleCfg ?? {},
      idea_source: cfg.ideaSource,
      est_cost_usd: estimate.batchUsd,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: runErr?.message ?? "Could not create the run." };

  // 3) Compute the publish schedule up front (absolute UTC per video, or null
  //    for all-at-once) so each seed carries its own release slot.
  const schedule = computeSchedule(
    ideas.length,
    cfg.scheduleMode ?? "all_at_once",
    cfg.scheduleCfg ?? {},
    new Date(),
  );

  // 4) Seed one video per idea (IDEA_APPROVED → the runner takes it from here).
  let created = 0;
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    const { error } = await db.from("videos").insert({
      project_id: projectId,
      idea_id: idea.id,
      title: idea.title,
      topic: idea.topic,
      status: "IDEA_APPROVED",
      kind: cfg.kind,
      target_length_sec: sampleLength(cfg.kind, lo, hi),
      build_run_id: run.id,
      auto_pilot_run: true,
      scheduled_publish_at: schedule[i] ?? null,
    });
    if (!error) {
      created++;
      if (idea.id) await db.from("ideas").update({ status: "approved" }).eq("id", idea.id);
    }
  }
  // Every seed insert failed → don't leave a zombie run stuck "generating" with
  // no videos (reconcileBuildRuns skips empty runs, so it would never complete).
  if (created === 0) {
    await db.from("build_runs").update({ status: "cancelled" }).eq("id", run.id);
    return { ok: false, error: "Could not seed any videos for this run." };
  }
  return { ok: true, runId: run.id as string, created };
}

/**
 * Build-runner unit of work (cron-called). Claims up to `limit` seed videos
 * across all runs and drives each: script → Full Auto-Generate (→ render →
 * Final review). Bounded so one cron invocation fits its time budget; a
 * per-video failure is isolated (paused_reason) and never blocks the batch.
 */
export async function processPendingBuildVideos(
  limit = 1,
  dbArg?: Db,
  opts?: { budgetMs?: number },
): Promise<{ processed: number; errors: number; held: number }> {
  const db = dbArg ?? (await createClient());
  const startedAt = Date.now();
  const budgetMs = opts?.budgetMs ?? Number.POSITIVE_INFINITY;
  const blocked = await blockedRunIds(db);
  // Over-fetch so a paused/cancelled run's seeds don't starve live runs, then
  // take the first `limit` that belong to an active run.
  const { data: pendingRaw } = await db
    .from("videos")
    .select("id, project_id, build_run_id")
    .not("build_run_id", "is", null)
    .eq("status", "IDEA_APPROVED")
    .order("created_at", { ascending: true })
    .limit(limit + blocked.size + 5);
  const pending = ((pendingRaw ?? []) as {
    id: string;
    project_id: string;
    build_run_id: string;
  }[])
    .filter((r) => !blocked.has(r.build_run_id))
    .slice(0, limit);

  let processed = 0;
  let errors = 0;
  let held = 0;
  for (const row of pending) {
    // Each seed runs a full script + asset generation (heavy: VO synthesis,
    // LLM calls). Stop claiming new seeds once we're near the route's time
    // budget so a pass never hard-times-out mid-video and strands it; the
    // remaining seeds are picked up on the next pass.
    if (Date.now() - startedAt > budgetMs) break;
    try {
      const project = await getProject(db, row.project_id);
      if (!project) throw new Error("Project not found");
      // Director Mode: Build & Post is an autonomous-only feature. Never claim
      // or drive a director project's seed (spec §4.3). The Build UI is hidden
      // for director projects and startBuildRun rejects them, so this is the
      // race backstop (e.g. a run seeded before a mode flip).
      if (isDirectorMode(project)) continue;
      // ATOMIC claim (Phase 3): conditional update — only the runner that
      // flips IDEA_APPROVED→SCRIPTING owns the seed. A concurrent cron pass
      // or "Run now" click matches zero rows and skips instead of running the
      // full script+asset generation twice.
      const { data: claimed } = await db
        .from("videos")
        .update({ status: "SCRIPTING" })
        .eq("id", row.id)
        .eq("status", "IDEA_APPROVED")
        .select("id");
      if (!claimed || claimed.length === 0) continue; // someone else claimed it
      const video = await getVideo(db, row.id);
      if (!video) throw new Error("Video not found after claim");
      const { data: run } = await db
        .from("build_runs")
        .select("tier, custom_spec, qc_floor")
        .eq("id", row.build_run_id)
        .maybeSingle();
      const floor = Number(run?.qc_floor ?? 7.0);

      await runScripting(db, video, project); // → SCRIPT_READY

      // QC-gated script approval (Phase 1): score the fresh script and, on a
      // sub-floor miss, revise exactly once with the QC issues injected. Still
      // below → hold at the Script gate for a human (never auto-build a weak
      // script). Skipped when QC isn't live (mock/dry runs flow through).
      const gate = await gateScriptForAutoPilot(db, video, project, floor);
      if (!gate.ok) {
        // Advisory mode (agent-training Step 1): a subjective score never
        // stalls the build — the verdict lands in the thread and the video
        // proceeds; the human grades the finished cut. Blocking mode keeps
        // the legacy hold.
        const qgEarly = await getQualityGateConfig(db);
        if (qgEarly.advisory) {
          await postWorkspaceNote(
            db,
            video,
            `Heads up — the script scored ${gate.score?.toFixed(1) ?? "?"}/10 after one revision (advisory floor ${floor.toFixed(1)}). Continuing anyway; judge the finished cut.`,
            { event: "advisory_script_qc", score: gate.score ?? null, floor },
          );
        } else {
          await db
            .from("videos")
            .update({
              auto_publish: false,
              paused_reason: `Held — script QC ${gate.score?.toFixed(1) ?? "?"}/10 below the ${floor.toFixed(1)} floor after one revision. Review the script.`,
            })
            .eq("id", row.id);
          held++;
          continue;
        }
      }

      // Editorial gate (Tier 1): when quality gates are on, review the finished
      // SCRIPT for legal/factual/spam BEFORE paying for assets. A hard 'fail'
      // here costs one script draft, not a full production. A lightweight
      // metadata-only recheck still runs at publish (operator approvals).
      const qg = await getQualityGateConfig(db);
      if (qg.enabled) {
        const latest = await loadLatestScript(db, row.id);
        const tags = ((latest?.metadata ?? {}) as { tags?: string[] }).tags ?? [];
        const guard = await editorialGuard({
          title: video.title,
          scriptBody: (latest?.body as string) ?? "",
          tags,
          niche: project.niche,
          mode: "full",
        });
        if (guard.costUsd > 0) {
          await recordCost(
            db,
            video,
            { provider: "anthropic", usd: guard.costUsd, description: "Editorial guard (script)" },
            `“${video.title}”`,
          );
        }
        if (guard.verdict === "fail") {
          const flags = [...guard.legalFlags, ...guard.factIssues, ...guard.metadataIssues];
          await db
            .from("videos")
            .update({
              auto_publish: false,
              paused_reason: `Held — editorial review: ${guard.note || flags[0] || "flagged"}. Review the script.`,
            })
            .eq("id", row.id);
          held++;
          continue;
        }
      }

      // Best-of-N packaging (Harness C2): the title is the biggest CTR lever,
      // but the autonomous path used to publish the idea title untouched.
      // Judge-select the strongest title + thumbnail phrase from the generated
      // candidates BEFORE assets (the thumb phrase feeds the render). Cheap
      // (~$0.01, Haiku pairwise); skipped when QC isn't live.
      await optimizePackaging(db, video, project);

      const tier = (run?.tier as AutoTier) ?? "economy";
      const custom = (run?.custom_spec as CustomSpec | null) ?? undefined;
      await fullAutoGenerate({ videoId: row.id, tier, custom }, db); // → assets → render → FINAL_REVIEW
      processed++;
    } catch (err) {
      errors++;
      await db
        .from("videos")
        .update({ paused_reason: `Build & Post paused — ${humanizeProviderError(String(err))}` })
        .eq("id", row.id);
      console.error(`build-runner ${row.id} failed:`, err);
    }
  }
  return { processed, errors, held };
}

// ── Full-Auto Build & Post (Phase 1): QC-gated auto-approval ───────────
// Reuses the QC agent (reviewGate), the qc_reviews ledger, and the QC→script
// feedback loop. Two gates carry an auto-pilot video unattended:
//   • Script gate — score ≥ floor → proceed; sub-floor → revise once → re-score;
//     still below → held for a human (handled inline in processPendingBuildVideos).
//   • Final gate  — the final-cut score sets posting privacy (P5): ≥ public
//     threshold → Public, floor..public → Unlisted, below floor → Held.
// The Assets gate stays owned by Full-Auto (auto_finish) + the render farm so the
// clip-replacement/render handoff is untouched; the final cut is the real check.

/** FINAL score cap when no real frame critique exists yet — below the default
    run floor (7.0) so an unassessed render HOLDS for a vision pass instead of
    recording a phantom 0 or auto-publishing blind. */
const FINAL_UNGROUNDED_HOLD = 6.5;

/** Score one gate with the QC agent and append it to the qc_reviews ledger
    (billing the review when live). Returns the score + concrete issues. */
async function scoreAndRecordGate(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
  escalateNear?: number,
): Promise<{ score: number; issues: string[] }> {
  const review = await reviewGate({
    gate,
    context: await qcContext(db, video, project, gate),
    escalateNear,
  });
  // FINAL is judged from a text summary, so its holistic publish_ready always
  // fails → phantom near-zero scores that don't measure the real video. Ground
  // the FINAL number in the actual rendered frames (vision critique) when we
  // have one; otherwise score structure only and HOLD (cap below the floor) for
  // a real vision pass rather than record a misleading 0 or auto-publish blind.
  let score = review.score;
  if (gate === "FINAL") {
    const vr = video.vision_review as { score?: number } | null;
    const g = finalGateScore(review.criteria, typeof vr?.score === "number" ? vr.score : null);
    score = g.grounded ? g.score : Math.min(g.score, FINAL_UNGROUNDED_HOLD);
  }
  await db.from("qc_reviews").insert({
    video_id: video.id,
    gate,
    // Degraded (no real judge) → record null, not the placeholder 6.0, so the
    // library never shows a fabricated score. The caller still gets `score` for
    // hold/advance logic (a degraded gate holds regardless).
    score: review.degraded ? null : score,
    verdict: review.verdict,
    issues: review.issues,
    strengths: review.strengths,
    criteria: review.criteria,
    judge_model: review.judgeModel,
    escalated: review.escalated,
    auto_approved: false,
  });
  if (review.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: "anthropic", usd: review.costUsd, description: "QC review" },
      `${GATE_LABELS[gate]} gate`,
    );
  }
  return { score, issues: review.issues };
}

/** QC the freshly-written script; on a sub-floor miss, revise once (QC issues
    injected via the existing feedback loop) and re-score. ok=false means it is
    still below the floor after the single revision → hold for a human. When QC
    isn't live there is no judge, so it passes through (dry run). */
/**
 * Best-of-N packaging (Harness C2): expand + judge-select the strongest title
 * and thumbnail phrase from the script's generated candidates, and apply the
 * winners (title on the video, thumb phrase on the latest script metadata).
 * Best-effort and cheap; a no-key/passthrough or any failure leaves the
 * existing packaging untouched. Runs on auto-pilot/build videos only (the
 * operator picks titles manually on the interactive path).
 */
async function optimizePackaging(db: Db, video: Video, project: Project): Promise<void> {
  if (!isQcLive()) return;
  try {
    const script = await loadLatestScript(db, video.id);
    if (!script) return;
    const meta = (script.metadata ?? {}) as { titles?: string[]; thumbPhrase?: string };
    const ctx = { title: video.title, niche: project.niche, topic: video.topic };

    const titleCandidates = [video.title, ...(meta.titles ?? [])];
    const title = await pickBestVariant({ kind: "title", candidates: titleCandidates, context: ctx, poolSize: 5 });

    const thumbCandidates = [meta.thumbPhrase ?? "", ...(meta.titles ?? [])].filter(Boolean);
    const thumb = await pickBestVariant({ kind: "thumb_phrase", candidates: thumbCandidates, context: { ...ctx, hook: (script.beats as ScriptBeat[] | null)?.[0]?.text }, poolSize: 4 });

    const totalCost = title.costUsd + thumb.costUsd;
    if (totalCost > 0) {
      await recordCost(db, video, { provider: "anthropic", usd: totalCost, description: "Best-of-N packaging (title + thumb)" }, `“${video.title}”`);
    }

    const newTitle = title.judged && title.winner ? title.winner : video.title;
    const newThumb = thumb.judged && thumb.winner ? thumb.winner : meta.thumbPhrase;
    if (newTitle !== video.title || newThumb !== meta.thumbPhrase) {
      await db
        .from("scripts")
        .update({
          metadata: {
            ...(script.metadata as Record<string, unknown>),
            thumbPhrase: newThumb,
            // Winner first so any downstream titles[0] use stays consistent.
            titles: [newTitle, ...(meta.titles ?? []).filter((t) => t !== newTitle)].slice(0, 5),
            packagingSelected: { titleJudged: title.judged, thumbJudged: thumb.judged },
          },
        })
        .eq("id", script.id);
      if (newTitle !== video.title) {
        await db.from("videos").update({ title: newTitle }).eq("id", video.id);
        video.title = newTitle;
        console.log(`🏷️  best-of-N title → "${newTitle}"`);
      }
    }
  } catch (err) {
    console.error("packaging optimization failed (non-fatal):", err);
  }
}

async function gateScriptForAutoPilot(
  db: Db,
  video: Video,
  project: Project,
  floor: number,
): Promise<{ ok: boolean; score: number | null }> {
  if (!isQcLive()) return { ok: true, score: null };

  const first = await scoreAndRecordGate(db, video, project, "SCRIPT", floor);
  if (first.score >= floor) {
    const held = await factCheckAtScriptGate(db, video, project);
    return { ok: !held, score: first.score };
  }

  // Revise once: feed the QC issues back as revision notes (runScripting reads
  // the latest revision approval), rewrite, and re-score.
  const notes = first.issues.length
    ? `Address these QC issues, then keep your editorial voice:\n- ${first.issues.join("\n- ")}`
    : "Sharpen the hook (first two sentences) and cut filler — the draft scored below the quality bar.";
  await db.from("approvals").insert({
    video_id: video.id,
    gate: "SCRIPT",
    decision: "revision",
    decided_by: "autopilot",
    notes,
    decided_at: new Date().toISOString(),
  });
  await runScripting(db, video, project); // reads latestNotes → SCRIPT_READY

  const second = await scoreAndRecordGate(db, video, project, "SCRIPT", floor);
  if (second.score >= floor) {
    const held = await factCheckAtScriptGate(db, video, project);
    return { ok: !held, score: second.score };
  }
  return { ok: false, score: second.score };
}

/** Resolve a run's QC thresholds (floor to publish at all; public threshold). */
async function runThresholds(
  db: Db,
  buildRunId: string | null,
): Promise<{ floor: number; pub: number }> {
  const cfg = await getQualityGateConfig(db);
  if (!buildRunId) return { floor: cfg.runFloor, pub: cfg.runPublic };
  const { data } = await db
    .from("build_runs")
    .select("qc_floor, qc_public")
    .eq("id", buildRunId)
    .maybeSingle();
  return { floor: Number(data?.qc_floor ?? cfg.runFloor), pub: Number(data?.qc_public ?? cfg.runPublic) };
}

/**
 * Final-gate auto-approval for auto-pilot videos that have rendered to
 * FINAL_REVIEW (cron-called heartbeat). The final-cut QC score decides posting
 * privacy (P5): ≥ public threshold → Public, floor..public → Unlisted, below
 * floor → Held. Approved videos advance to APPROVED with publish_privacy +
 * auto_publish set; the Phase 2 scheduler releases them at their slot (until
 * then they simply wait — nothing publishes). Idempotent: a non-null
 * paused_reason (held) or a non-FINAL_REVIEW status drops a video from the scan.
 * No-op when QC isn't live — videos stay at FINAL_REVIEW for a human glance.
 */
export async function finalizeAutoPilotVideos(
  limit = 5,
  dbArg?: Db,
): Promise<{ finalized: number; held: number }> {
  const db = dbArg ?? (await createClient());
  if (!isQcLive()) return { finalized: 0, held: 0 };

  const blocked = await blockedRunIds(db);
  const { data: pending } = await db
    .from("videos")
    .select("id, project_id, build_run_id, title")
    .eq("auto_pilot_run", true)
    .eq("status", "FINAL_REVIEW")
    .is("paused_reason", null)
    .order("updated_at", { ascending: true })
    .limit(limit + blocked.size + 5);

  let finalized = 0;
  let held = 0;
  for (const row of ((pending ?? []) as {
    id: string;
    project_id: string;
    build_run_id: string | null;
    title: string;
  }[])
    .filter((r) => !(r.build_run_id && blocked.has(r.build_run_id)))
    .slice(0, limit)) {
    try {
      const project = await getProject(db, row.project_id);
      const video = await getVideo(db, row.id);
      if (!project || !video) continue;
      // Director Mode: the finalizer never publishes for a director project —
      // publish is always an explicit operator action (spec §4.3, §6.5).
      if (isDirectorMode(project)) continue;
      // Auto Pilot Operator owns its videos' approval — they hold at
      // FINAL_REVIEW for one-tap approval (or auto-approve) rather than the
      // build-runner auto-publishing them here.
      if (video.operator_run_id) continue;
      // Defer to the auto-fix loop (shared settle rule 1): let the loop
      // converge before publishing a pre-fix cut. (The sweep runs before this
      // in the same cron pass; this guards the rare over-the-limit race.)
      if (!autofixSettled(project, video)) continue;
      const { floor, pub } = await runThresholds(db, row.build_run_id);
      const { score } = await scoreAndRecordGate(db, video, project, "FINAL", floor);

      // Self-Watch parity (shared settle rules 2+3): the same pre-publish gate
      // the operator applies also gates the build-run finalizer.
      const qg = await getQualityGateConfig(db);
      const watch = await resolveWatchVerdict(db, video, project);
      const { blocked: watchBlocks } = watchBlocksPublish(watch, qg);

      // Advisory mode (Step 1): a sub-floor FINAL score doesn't hold — the
      // video posts UNLISTED with the verdict in the thread; the human's own
      // grade decides whether it flips public. Policy risks still block.
      const advisoryPass = qg.advisory && !watchBlocks;
      if ((score >= floor || advisoryPass) && !watchBlocks) {
        const privacy = qg.advisory && score < floor ? "unlisted" : privacyForScore(score, pub);
        await db
          .from("videos")
          .update({ publish_privacy: privacy, auto_publish: true, paused_reason: null })
          .eq("id", row.id);
        if (score < floor) {
          await postWorkspaceNote(
            db,
            { id: row.id, project_id: row.project_id },
            `Final cut scored ${score.toFixed(1)}/10 (advisory floor ${floor.toFixed(1)}) — posting UNLISTED so you can grade it before it goes public.`,
            { event: "advisory_final_qc", score, floor },
          );
        }
        await decideGate({ videoId: row.id, decision: "approved" }, db, "autopilot");
        finalized++;
        try {
          await sendPushToAll({
            title: `Auto-approved · ${privacy === "public" ? "Public" : "Unlisted"}`,
            body: `“${row.title}” passed final QC ${score.toFixed(1)}/10 — scheduled to post.`,
            url: `/projects/${row.project_id}/review`,
          });
        } catch (err) {
          console.error("web-push delivery failed:", err);
        }
      } else {
        const reason =
          score < floor
            ? `final QC ${score.toFixed(1)}/10 below the ${floor.toFixed(1)} floor`
            : watchHoldReason(watch!, qg);
        await db
          .from("videos")
          .update({
            auto_publish: false,
            paused_reason: `Held — ${reason}. Review and approve manually.`,
          })
          .eq("id", row.id);
        held++;
        try {
          await sendPushToAll({
            title: "Held for review",
            body: `“${row.title}” held — ${reason}.`,
            url: `/projects/${row.project_id}/review`,
          });
        } catch (err) {
          console.error("web-push delivery failed:", err);
        }
      }
    } catch (err) {
      console.error(`finalize auto-pilot ${row.id} failed:`, err);
    }
  }
  return { finalized, held };
}

/**
 * Publish scheduler (Phase 2). Releases approved auto-pilot videos whose slot
 * is due: a video that is APPROVED, auto_publish, not yet requested, and either
 * past its scheduled_publish_at or all-at-once (null slot) is flagged
 * publish_requested. The render farm's publishStagedVideos then uploads it to
 * the project's channel at its publish_privacy (P5). Idempotent — publish_
 * requested is a one-way latch, so a restart or double-run never double-posts.
 * Capped per pass to stay clear of YouTube's daily upload quota (§8).
 */
export async function releaseScheduledVideos(
  limit = 6,
  dbArg?: Db,
): Promise<{ released: number }> {
  const db = dbArg ?? (await createClient());
  const blocked = await blockedRunIds(db);
  const nowIso = new Date().toISOString();
  const { data: due } = await db
    .from("videos")
    .select("id, project_id, title, scheduled_publish_at, build_run_id")
    .eq("auto_publish", true)
    .eq("status", "APPROVED")
    .eq("publish_requested", false)
    .is("youtube_video_id", null)
    .or(`scheduled_publish_at.is.null,scheduled_publish_at.lte.${nowIso}`)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: true })
    .limit(limit + blocked.size + 5);

  // Director Mode: scheduled auto-release never fires for a director project —
  // publish is always manual (spec §4.3, §6.5). Exclude their videos up front.
  const directorProjects = await directorProjectIds(db);

  let released = 0;
  for (const v of ((due ?? []) as {
    id: string;
    project_id: string;
    title: string;
    build_run_id: string | null;
  }[])
    .filter((r) => !(r.build_run_id && blocked.has(r.build_run_id)))
    .filter((r) => !directorProjects.has(r.project_id))
    .slice(0, limit)) {
    await db.from("videos").update({ publish_requested: true }).eq("id", v.id);
    released++;
    try {
      await sendPushToAll({
        title: "Publishing now",
        body: `“${v.title}” reached its slot — uploading to YouTube.`,
        url: `/projects/${v.project_id}/review`,
      });
    } catch (err) {
      console.error("web-push delivery failed:", err);
    }
  }
  return { released };
}

// ── Run control (P10) ─────────────────────────────────────────────────

/** Pause a run — the runner/scheduler stop advancing its videos; in-flight
    work already underway finishes, but nothing new starts. Reversible. */
export async function pauseBuildRun(runId: string, dbArg?: Db): Promise<{ ok: boolean }> {
  const db = dbArg ?? (await createClient());
  await db.from("build_runs").update({ status: "paused" }).eq("id", runId);
  return { ok: true };
}

/** Resume a paused run (back to generating; the scheduler/finalizer pick up
    where they left off). No-op on a cancelled run. */
export async function resumeBuildRun(runId: string, dbArg?: Db): Promise<{ ok: boolean }> {
  const db = dbArg ?? (await createClient());
  const { data: run } = await db
    .from("build_runs")
    .select("status")
    .eq("id", runId)
    .maybeSingle();
  if ((run?.status as string) === "cancelled") return { ok: false };
  await db.from("build_runs").update({ status: "generating" }).eq("id", runId);
  return { ok: true };
}

/** Cancel a run — stop everything not yet posted (kill un-published videos and
    clear their publish flags), keep anything already on YouTube (P10). */
export async function cancelBuildRun(
  runId: string,
  dbArg?: Db,
): Promise<{ ok: boolean; stopped: number }> {
  const db = dbArg ?? (await createClient());
  await db.from("build_runs").update({ status: "cancelled" }).eq("id", runId);
  const { data: vids } = await db
    .from("videos")
    .select("id, status, youtube_video_id")
    .eq("build_run_id", runId);
  let stopped = 0;
  for (const v of (vids ?? []) as {
    id: string;
    status: string;
    youtube_video_id: string | null;
  }[]) {
    // Keep posted videos; stop the rest.
    if (v.youtube_video_id || v.status === "TRACKING" || v.status === "KILLED") continue;
    await db
      .from("videos")
      .update({
        status: "KILLED",
        auto_publish: false,
        publish_requested: false,
        paused_reason: "Build & Post run cancelled",
      })
      .eq("id", v.id);
    stopped++;
  }
  return { ok: true, stopped };
}

// ── Monitoring & alerts (Phase 6) ─────────────────────────────────────

/** Pre-publish stages — a run with any video here is still "generating". */
const GENERATING_STAGES = new Set<VideoStatus>([
  "IDEA_APPROVED",
  "SCRIPTING",
  "SCRIPT_READY",
  "GENERATING_ASSETS",
  "ASSETS_READY",
  "ASSEMBLING",
  "FINAL_REVIEW",
]);

/**
 * Reconcile each active run's status from its videos and fire a one-time
 * "run complete" alert when it finishes (Phase 6). A video is terminal when
 * it is posted (TRACKING / has a YouTube id), killed, or held (paused and not
 * posted). Derived status:
 *   • done       — nothing left in flight,
 *   • publishing — an approved video is staged for upload (publish_requested),
 *   • scheduled  — all remaining work is approved, waiting for its slot,
 *   • generating — something is still being built.
 * Idempotent: a run already done/cancelled is skipped, so the completion push
 * fires exactly once (on the transition into done).
 */
export async function reconcileBuildRuns(
  dbArg?: Db,
): Promise<{ completed: number; updated: number }> {
  const db = dbArg ?? (await createClient());
  const { data: runs } = await db
    .from("build_runs")
    .select("id, project_id, status")
    .not("status", "in", "(done,cancelled,paused)");

  let completed = 0;
  let updated = 0;
  for (const run of (runs ?? []) as {
    id: string;
    project_id: string;
    status: string;
  }[]) {
    const { data: vids } = await db
      .from("videos")
      .select("status, youtube_video_id, paused_reason, publish_requested, title")
      .eq("build_run_id", run.id);
    const rows = (vids ?? []) as {
      status: VideoStatus;
      youtube_video_id: string | null;
      paused_reason: string | null;
      publish_requested: boolean;
      title: string;
    }[];
    if (rows.length === 0) continue;

    const isPosted = (v: (typeof rows)[number]) =>
      Boolean(v.youtube_video_id) || v.status === "TRACKING";
    const isKilled = (v: (typeof rows)[number]) => v.status === "KILLED";
    const isHeld = (v: (typeof rows)[number]) =>
      Boolean(v.paused_reason) && !isPosted(v) && !isKilled(v);
    const inFlight = rows.filter((v) => !isPosted(v) && !isKilled(v) && !isHeld(v));

    let next: BuildRunStatus;
    if (inFlight.length === 0) next = "done";
    else if (inFlight.some((v) => v.publish_requested)) next = "publishing";
    else if (inFlight.every((v) => v.status === "APPROVED")) next = "scheduled";
    else if (inFlight.some((v) => GENERATING_STAGES.has(v.status))) next = "generating";
    else next = "generating";

    if (next === run.status) continue;
    await db.from("build_runs").update({ status: next }).eq("id", run.id);
    updated++;

    if (next === "done") {
      completed++;
      const posted = rows.filter(isPosted).length;
      const held = rows.filter(isHeld).length;
      const killed = rows.filter(isKilled).length;
      const parts = [`${posted} posted`];
      if (held) parts.push(`${held} held`);
      if (killed) parts.push(`${killed} stopped`);
      try {
        await sendPushToAll({
          title: held ? "Run complete — some held" : "Build & Post run complete",
          body: `${parts.join(" · ")}.${held ? " Held items need a glance." : ""}`,
          url: `/projects/${run.project_id}`,
        });
      } catch (err) {
        console.error("web-push delivery failed:", err);
      }
    }
  }
  return { completed, updated };
}

/**
 * Heal videos stranded at ASSEMBLING. The render farm stores the cut, then
 * advances status — a crash between those steps (or a publish whose status
 * lagged) leaves a video stuck at "assembling" though it's effectively done.
 * Only touches videos untouched for ≥20 min, so an in-flight render is never
 * raced. The status guard on each update keeps it safe under concurrency:
 *   • youtube_video_id set → published → TRACKING.
 *   • a stored render cut  → rendered  → FINAL_REVIEW.
 *   • neither              → left for the farm / operator Resume.
 */
export async function reconcileStuckRenders(dbArg?: Db): Promise<{ healed: number }> {
  const db = dbArg ?? (await createClient());
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data: stuck } = await db
    .from("videos")
    .select("id, youtube_video_id")
    .eq("status", "ASSEMBLING")
    .lt("updated_at", cutoff)
    .limit(25);

  let healed = 0;
  for (const v of (stuck ?? []) as { id: string; youtube_video_id: string | null }[]) {
    if (v.youtube_video_id) {
      const { error } = await db
        .from("videos")
        .update({ status: "TRACKING", published_at: new Date().toISOString(), paused_reason: null })
        .eq("id", v.id)
        .eq("status", "ASSEMBLING");
      if (!error) healed++;
      continue;
    }
    const { data: render } = await db
      .from("assets")
      .select("id")
      .eq("video_id", v.id)
      .eq("kind", "render")
      .not("storage_path", "is", null)
      .limit(1);
    if (render && render.length > 0) {
      const { error } = await db
        .from("videos")
        .update({ status: "FINAL_REVIEW", paused_reason: null })
        .eq("id", v.id)
        .eq("status", "ASSEMBLING");
      if (!error) healed++;
    }
  }
  return { healed };
}

/**
 * Self-heal autopilot seeds stranded MID-PIPELINE. processPendingBuildVideos
 * only claims IDEA_APPROVED, and it drives script→gate→assets in ONE pass — so
 * if a pass is cut off by the route's wall-clock cap between stages, the seed
 * strands at SCRIPTING or SCRIPT_READY and nothing ever resumes it (the class of
 * bug that left build_runs "generating" for weeks). This reconciler re-drives
 * them, and is idempotent (safe to retry every pass):
 *   • SCRIPT_READY (script passed its gate, assets never ran) → resume
 *     fullAutoGenerate, KEEPING the good script. One per pass so a heavy
 *     generate can't blow the route budget; a repeat timeout just retries next
 *     pass (no re-script, no wasted spend).
 *   • SCRIPTING (script generation itself was interrupted) → reset to
 *     IDEA_APPROVED so the normal flow re-scripts it.
 *   • GENERATING_ASSETS with NO assets and NO clip jobs (fullAutoGenerate was
 *     cut off after the script gate but before it enqueued a single clip, so
 *     the asset stage never actually started) → reset to SCRIPT_READY so the
 *     resume branch re-drives it. Gated on zero assets AND zero clip jobs so a
 *     video that genuinely has generation in flight is never rewound (no
 *     double-spend — there is nothing to duplicate).
 */
export async function reconcileStrandedSeeds(dbArg?: Db): Promise<{ resumed: number; reset: number }> {
  const db = dbArg ?? (await createClient());
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const blocked = await blockedRunIds(db);
  const { data: stranded } = await db
    .from("videos")
    .select("id, project_id, build_run_id, status")
    .eq("auto_pilot_run", true)
    .in("status", ["SCRIPTING", "SCRIPT_READY", "GENERATING_ASSETS"])
    .is("paused_reason", null)
    .not("build_run_id", "is", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(10);

  let resumed = 0;
  let reset = 0;
  for (const v of (stranded ?? []) as { id: string; project_id: string; build_run_id: string; status: string }[]) {
    if (blocked.has(v.build_run_id)) continue;
    const project = await getProject(db, v.project_id);
    if (!project || isDirectorMode(project)) continue;
    if (v.status === "SCRIPTING") {
      const { error } = await db
        .from("videos")
        .update({ status: "IDEA_APPROVED" })
        .eq("id", v.id)
        .eq("status", "SCRIPTING");
      if (!error) reset++;
    } else if (v.status === "GENERATING_ASSETS") {
      // Only a CLEAN strand rewinds: no assets produced and no clip jobs queued
      // means the asset stage never started, so re-running fullAutoGenerate from
      // SCRIPT_READY duplicates nothing. A video with any asset/clip job in
      // flight is left for the clip worker / reconcileStuckRenders.
      const [{ count: assetCount }, { count: jobCount }] = await Promise.all([
        db.from("assets").select("id", { count: "exact", head: true }).eq("video_id", v.id),
        db.from("clip_jobs").select("id", { count: "exact", head: true }).eq("video_id", v.id),
      ]);
      if ((assetCount ?? 0) === 0 && (jobCount ?? 0) === 0) {
        const { error } = await db
          .from("videos")
          .update({ status: "SCRIPT_READY", auto_finish: false })
          .eq("id", v.id)
          .eq("status", "GENERATING_ASSETS");
        if (!error) reset++;
      }
    } else if (resumed === 0) {
      const { data: run } = await db
        .from("build_runs")
        .select("tier, custom_spec")
        .eq("id", v.build_run_id)
        .maybeSingle();
      try {
        await fullAutoGenerate(
          {
            videoId: v.id,
            tier: (run?.tier as AutoTier) ?? "economy",
            custom: (run?.custom_spec as CustomSpec | null) ?? undefined,
          },
          db,
        );
        resumed++;
      } catch (err) {
        console.error(`reconcileStrandedSeeds resume ${v.id}:`, err);
      }
    }
  }
  return { resumed, reset };
}

/**
 * Retry a video's clip jobs after a provider outage (e.g. fal balance
 * exhausted). Any beat whose keyframe degraded to a mock placeholder is
 * re-rendered as a real still now that the provider is live again (cheap —
 * skips beats that already hold a real still or a finished video clip), then
 * the errored clip jobs are requeued for the worker. VO is untouched.
 */
export async function retryClips(
  opts: { videoId: string },
  dbArg?: Db,
): Promise<{ ok: true; regenerated: number; requeued: number } | { ok: false; error: string }> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const script = await loadLatestScript(db, opts.videoId);
  const beats = (script?.beats ?? []) as ScriptBeat[];
  const { data: existing } = await db
    .from("assets")
    .select("beat_index, provider, meta")
    .eq("video_id", opts.videoId)
    .eq("kind", "clip");

  let regenerated = 0;
  for (const beat of beats) {
    const cur = (existing ?? []).find((a) => a.beat_index === beat.idx);
    // Keep finished video clips and real (non-mock) stills/stock as-is.
    if ((cur?.meta as { isVideo?: boolean } | undefined)?.isVideo) continue;
    if (cur && !String(cur.provider).startsWith("mock")) continue;
    // Per-beat budget re-check: recordCost keeps the running total current,
    // so a long retry sweep stops the moment a cap is hit.
    const guard = await checkBudget(db, project, video, 0.05);
    if (!guard.ok) return { ok: false, error: guard.reason };
    const draft = await makeBeatClip(video, project, beat);
    await db
      .from("assets")
      .delete()
      .eq("video_id", opts.videoId)
      .eq("kind", "clip")
      .eq("beat_index", beat.idx);
    await db.from("assets").insert(draft.row);
    await recordCost(db, video, draft.cost, `beat ${beat.idx + 1} (retry)`);
    regenerated += 1;
  }

  const { data: requeuedRows } = await db
    .from("clip_jobs")
    .update({ status: "queued", error: null })
    .eq("video_id", opts.videoId)
    .eq("status", "error")
    .lt("attempts", 3) // don't requeue jobs that already exhausted their retries
    .select("id");
  return { ok: true, regenerated, requeued: (requeuedRows ?? []).length };
}

async function voDurations(db: Db, videoId: string): Promise<Map<number, number>> {
  const { data } = await db
    .from("assets")
    .select("beat_index, meta")
    .eq("video_id", videoId)
    .eq("kind", "vo");
  const m = new Map<number, number>();
  for (const a of data ?? []) {
    if (a.beat_index !== null) m.set(a.beat_index, Number((a.meta as { durationSec?: number }).durationSec ?? 0));
  }
  return m;
}

// ── Phase B — generated video clips (Kling / Veo / Seedance via fal) ───

export type VideoGenResult =
  | { ok: true; url: string | null; costUsd: number }
  | { ok: false; error: string };

/** Portfolio-wide AI video-generation spend this month (drives the cap). */
async function monthVideoSpend(db: Db): Promise<number> {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("provider", VIDEO_PROVIDER)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Generate an original video clip for one beat — image-to-video from our own
    FLUX keyframe when present, else text-to-video. Guarded by the $100/mo video
    cap; replaces the beat's existing clip asset and ledgers the spend. */
export async function generateBeatVideo(opts: {
  videoId: string;
  beatIdx: number;
  modelId: string;
  durationSec: number;
}): Promise<VideoGenResult> {
  const db = await createClient();
  if (!isFalLive()) {
    return { ok: false, error: "Video generation needs FAL_KEY (currently mock mode)." };
  }
  const model = getVideoModel(opts.modelId);
  if (!model) return { ok: false, error: "Unknown video model." };
  const dur = clampDuration(model, opts.durationSec);

  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  // $100/mo portfolio cap (estimate-gated before we spend).
  const est = estimateClipCost(model, dur);
  const spent = await monthVideoSpend(db);
  if (spent + est > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `Monthly video budget reached ($${VIDEO_MONTHLY_CAP_USD}). $${spent.toFixed(2)} used this month; this clip needs ~$${est.toFixed(2)}.`,
    };
  }
  // Per-project caps too — the portfolio cap alone lets one channel eat the month.
  const projGuard = await checkBudget(db, project, video, est);
  if (!projGuard.ok) return { ok: false, error: projGuard.reason };

  const script = await loadLatestScript(db, video.id);
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find((b) => b.idx === opts.beatIdx);
  if (!beat) return { ok: false, error: "Beat not found" };

  // Seed-still vision gate (Tier 4 #1): re-roll a weak seed before paying to
  // animate it (runs before we read the keyframe below, so we use the new one).
  await vetSeedStillForBeat(db, video, project, beat);

  // Prefer image-to-video from our own keyframe still, if one exists.
  const { data: still } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isStill = still?.storage_path && !(still.meta as { isVideo?: boolean })?.isVideo;
  const imageUrl = isStill ? (await getSignedMediaUrl(still!.storage_path)) ?? undefined : undefined;

  // VCE V1 — condition the clip prompt on the Visual Bible too (not just stills),
  // so video keeps the style contract / palette / subject consistency.
  const prompt = buildVisualPrompt(beat.visualPrompt, project.brand_kit.thumbnailStyle, video.visual_bible ?? null);
  let out: Awaited<ReturnType<typeof generateVideo>>;
  try {
    out = await generateVideo({ model, prompt, imageUrl, durationSec: dur });
  } catch (err) {
    // A queue timeout still bills — the job keeps running server-side. Ledger
    // the estimate so spend guards see it (Phase 2: no untracked spend).
    if (err instanceof FalVideoTimeoutError) {
      await recordCost(
        db,
        video,
        { provider: VIDEO_PROVIDER, usd: err.estCostUsd, description: `AI video clip (${model.label}) — timed out; spend estimated, unverified` },
        `beat ${opts.beatIdx + 1}`,
      );
    }
    throw err;
  }

  const path = `videos/${video.id}/beat-${opts.beatIdx}-video.mp4`;
  await uploadMedia(path, out.video, "video/mp4");

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: VIDEO_PROVIDER,
    storage_path: path,
    beat_index: opts.beatIdx,
    meta: {
      shotType: beat.shotType,
      isVideo: true,
      videoModel: model.id,
      model: model.label,
      durationSec: dur,
    },
    cost_usd: out.costUsd,
  });
  await recordCost(
    db,
    video,
    { provider: VIDEO_PROVIDER, usd: out.costUsd, description: `AI video clip (${model.label})` },
    `beat ${opts.beatIdx + 1}`,
  );

  return { ok: true, url: await getSignedMediaUrl(path), costUsd: out.costUsd };
}

/** Phase 6.5 — apply a chosen licensed candidate to a beat. Images are
    copied into Storage so the render farm uses them and links never rot;
    videos keep their direct (licensed) file URL. Attribution metadata is
    stored on the asset for the ledger / Publish Kit. */
export async function applySourceClip(opts: {
  videoId: string;
  beatIdx: number;
  candidate: SourceCandidate;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const c = opts.candidate;

  // Re-screen the licence server-side — never trust a client-supplied verdict.
  const lic = classifyLicense(c.license.id, c.license.url);
  if (!lic) {
    return { ok: false, error: "That source's licence isn't usable for commercial remix." };
  }

  // The provider's media URL is fetched here and/or streamed by the render
  // worker — validate it's a public host before it's stored/fetched (SSRF: a
  // compromised or spoofed provider response can't point us at internal hosts).
  const safeFull = checkPublicHttpUrl(c.fullUrl);
  if (!safeFull.ok) return { ok: false, error: `Source media URL rejected: ${safeFull.reason}` };

  const meta: Record<string, unknown> = {
    shotType: "stock",
    sourceProvider: c.provider,
    sourceUrl: c.sourceUrl,
    author: c.author,
    license: lic,
    fromLibrary: true,
  };
  let storagePath = "";

  if (c.kind === "video") {
    meta.url = c.fullUrl; // OffthreadVideo streams the licensed file directly
    meta.posterUrl = c.thumbUrl;
    meta.durationSec = c.durationSec;
  } else {
    // Download the still into our bucket (small) so the render can pan it.
    const res = await fetch(c.fullUrl);
    if (!res.ok) return { ok: false, error: `Couldn't fetch the image (HTTP ${res.status}).` };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = c.fullUrl.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    storagePath = `videos/${video.id}/beat-${opts.beatIdx}-lib.${ext.slice(0, 4)}`;
    await uploadMedia(storagePath, buf, contentTypeFor(ext));
    meta.posterUrl = c.thumbUrl;
    meta.stillImage = true;
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: c.provider,
    storage_path: storagePath,
    beat_index: opts.beatIdx,
    meta,
    cost_usd: 0,
  });
  await recordCost(
    db,
    video,
    { provider: c.provider, usd: 0, description: `Licensed ${c.kind} (${lic.label}) — free` },
    `beat ${opts.beatIdx + 1}`,
  );
  return { ok: true };
}

/**
 * Gaming-compliant lane (Phase 10): attach an official **press-kit** or
 * **own-capture** asset to a beat by URL. Deliberately skips the automatic
 * licence screen — this lane is *manually gated*: the operator vouches that
 * the URL is a publisher-permitted press asset or their own recording. It is
 * never reachable by the autonomous agent. Attribution is required and flows
 * into the Publish Kit description.
 */
export async function applyPressKitClip(opts: {
  videoId: string;
  beatIdx: number;
  url: string;
  title: string;
  author: string;
  sourceUrl?: string;
  kind: "image" | "video";
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  // This URL is fetched server-side and/or streamed by the render worker —
  // block non-public / internal / metadata hosts (SSRF).
  const safeUrl = checkPublicHttpUrl(opts.url);
  if (!safeUrl.ok) return { ok: false, error: `Asset URL rejected: ${safeUrl.reason}` };

  const license = {
    id: "press-kit",
    label: "Official press kit / own-capture",
    url: opts.sourceUrl || undefined,
    requiresAttribution: true,
  };
  const meta: Record<string, unknown> = {
    shotType: "stock",
    sourceProvider: "press-kit",
    sourceUrl: opts.sourceUrl || opts.url,
    author: opts.author || "Publisher press kit",
    title: opts.title,
    license,
    fromLibrary: true,
    manualPressKit: true,
  };
  let storagePath = "";

  if (opts.kind === "video") {
    meta.url = opts.url;
    meta.posterUrl = opts.url;
  } else {
    const res = await fetch(opts.url);
    if (!res.ok) return { ok: false, error: `Couldn't fetch the asset (HTTP ${res.status}).` };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = opts.url.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    storagePath = `videos/${video.id}/beat-${opts.beatIdx}-presskit.${ext.slice(0, 4)}`;
    await uploadMedia(storagePath, buf, contentTypeFor(ext));
    meta.posterUrl = opts.url;
    meta.stillImage = true;
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: "press-kit",
    storage_path: storagePath,
    beat_index: opts.beatIdx,
    meta,
    cost_usd: 0,
  });
  return { ok: true };
}

function contentTypeFor(ext: string): string {
  if (ext.startsWith("png")) return "image/png";
  if (ext.startsWith("gif")) return "image/gif";
  if (ext.startsWith("webp")) return "image/webp";
  return "image/jpeg";
}

/** Inline script edit: saves a new script version with the edited beat and
    re-synthesizes VO for just that beat (live mode only). */
export async function editScriptBeat(opts: {
  videoId: string;
  beatIdx: number;
  text: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to edit" };

  const beats = (script.beats as ScriptBeat[]).map((b) =>
    b.idx === opts.beatIdx ? { ...b, text: opts.text } : b,
  );
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtime_sec: script.runtime_sec,
    metadata: script.metadata,
  });

  // Regenerate VO only for the edited section, and only if VO exists yet
  // (i.e. the video has passed the asset stage at least once).
  const { data: voAsset } = await db
    .from("assets")
    .select("id")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", opts.beatIdx)
    .maybeSingle();
  if (voAsset && canSynthesize(project.voice_id)) {
    const beat = beats.find((b) => b.idx === opts.beatIdx)!;
    // Same pronunciation lexicon as the full asset stage so the re-synthesized
    // beat says acronyms/jargon consistently with the rest of the narration.
    let lexicon: Lexicon | undefined;
    try {
      lexicon = (
        await buildScriptLexicon({ title: video.title, niche: project.niche, topic: video.topic, beats })
      ).lexicon;
    } catch {
      /* dictionary-less fallback — synthesize plain */
    }
    const r = await synthesizeBeatVo(db, video, project, beat, lexicon);
    await recordCost(
      db,
      video,
      {
        provider: r.provider,
        usd: r.costUsd,
        description: r.cached
          ? "Voiceover reused from cache — free"
          : "Voiceover re-synthesis (edited beat)",
      },
      `beat ${opts.beatIdx + 1}`,
    );
  }
  return { ok: true };
}

// ── Script Remix ──────────────────────────────────────────────────────
// "Propose → accept": a remix call produces a proposed revision WITHOUT
// touching the saved script. The token cost is real either way, so it is
// logged at propose time; persistence happens only on accept.

async function loadLatestScript(db: Db, videoId: string) {
  const { data } = await db
    .from("scripts")
    .select("*")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export type ScriptRemixResult =
  | { ok: true; remix: ScriptRemix }
  | { ok: false; error: string };

export async function proposeScriptRemix(opts: {
  videoId: string;
  notes: string;
  settings: RemixSettings;
}): Promise<ScriptRemixResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to remix yet" };

  const remix = await remixScript({
    title: video.title,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    beats: script.beats as ScriptBeat[],
    metadata: script.metadata as ScriptRemix["metadata"],
    runtimeSec: script.runtime_sec ?? video.target_length_sec,
    notes: opts.notes,
    settings: opts.settings,
  });
  if (remix.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: remix.provider, usd: remix.costUsd, description: "Script remix (whole)" },
      "proposed",
    );
  }
  return { ok: true, remix };
}

export type BeatRemixResult =
  | { ok: true; remix: BeatRemix }
  | { ok: false; error: string };

export async function proposeBeatRemix(opts: {
  videoId: string;
  beatIdx: number;
  notes: string;
  settings: RemixSettings;
}): Promise<BeatRemixResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to remix yet" };

  const remix = await remixBeat({
    title: video.title,
    niche: project.niche,
    tone: project.tone,
    beats: script.beats as ScriptBeat[],
    targetIdx: opts.beatIdx,
    notes: opts.notes,
    settings: opts.settings,
  });
  if (remix.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: remix.provider, usd: remix.costUsd, description: "Script remix (section)" },
      `beat ${opts.beatIdx + 1} proposed`,
    );
  }
  return { ok: true, remix };
}

/** Accept a whole-script remix: persist it as a new script version. Asset/VO
    re-sync is intentionally left to the existing per-beat re-voice flow — a
    whole remix is expected at the SCRIPT review stage, before VO exists. */
export async function applyScriptRemix(opts: {
  videoId: string;
  beats: ScriptBeat[];
  runtimeSec: number | null;
  metadata: ScriptRemix["metadata"];
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (!opts.beats.length) return { ok: false, error: "Remix has no sections" };

  const beats = opts.beats.map((b, idx) => ({ ...b, idx }));
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtime_sec: opts.runtimeSec,
    metadata: opts.metadata,
  });
  return { ok: true };
}

export type StepBackResult = EngineResult & { target?: VideoStatus };

/** Send a video back one stage to the previous gate (e.g. asset generation →
    script approval) when the operator changes their mind. Cancels any in-flight
    long-clip jobs, clears a pending auto-finish so the worker can't advance a
    reverted video, and optionally discards the generated assets. VO stays
    cached in `vo_cache`, so unchanged narration re-voices free on the next run.
    The video lands paused at the previous gate — the pipeline is NOT resumed,
    leaving room to edit/remix the script or re-run Full Auto. */
export async function stepBackStage(opts: {
  videoId: string;
  deleteAssets: boolean;
}): Promise<StepBackResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };

  const target = PREVIOUS_STAGE[video.status];
  if (!target) {
    return { ok: false, error: `This video can't be stepped back from ${video.status}.` };
  }

  // Cancel queued/running long-clip jobs — they target the stage being left.
  await db
    .from("clip_jobs")
    .delete()
    .eq("video_id", video.id)
    .in("status", ["queued", "running"]);

  // Optionally discard generated assets (clips, stills, VO, captions, thumbs).
  if (opts.deleteAssets) {
    await db.from("assets").delete().eq("video_id", video.id);
  }

  // Land on the previous gate, paused, and clear any pending auto-finish.
  await db
    .from("videos")
    .update({ status: target, auto_finish: false })
    .eq("id", video.id);
  return { ok: true, target };
}

/** Title/description edits from the script review screen — versioned like
    any other script change. */
export async function editVideoMetadata(opts: {
  videoId: string;
  title: string;
  description: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };

  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script yet" };

  const metadata = {
    ...(script.metadata as Record<string, unknown>),
    titles: [
      opts.title,
      ...(((script.metadata as { titles?: string[] }).titles ?? []).filter(
        (t) => t !== opts.title,
      )),
    ].slice(0, 3),
    description: opts.description,
  };
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: script.body,
    beats: script.beats,
    runtime_sec: script.runtime_sec,
    metadata,
  });
  await db.from("videos").update({ title: opts.title }).eq("id", video.id);
  return { ok: true };
}

// ── Kinetic Highlights ────────────────────────────────────────────────

/** Toggle the opt-in / set the operator target count for a video. */
export async function setHighlightOptions(opts: {
  videoId: string;
  enabled: boolean;
  count: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const { error } = await db
    .from("videos")
    .update({
      enable_highlights: opts.enabled,
      highlight_count: Math.max(0, Math.min(12, Math.round(opts.count))),
    })
    .eq("id", opts.videoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Toggle word-window captions for a video (rendered on the next render). */
export async function setCaptionsEnabled(opts: {
  videoId: string;
  enabled: boolean;
}): Promise<EngineResult> {
  const db = await createClient();
  const { error } = await db
    .from("videos")
    .update({ enable_captions: opts.enabled })
    .eq("id", opts.videoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** (Re)run curation for a video against its latest script. */
export async function curateHighlightsForVideo(opts: {
  videoId: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const script = await loadLatestScript(db, video.id);
  const beats = (script?.beats as ScriptBeat[] | undefined) ?? [];
  if (beats.length === 0) return { ok: false, error: "No script to curate yet" };

  // Enabling here is implicit — the operator asked for highlights.
  if (!video.enable_highlights) {
    await db.from("videos").update({ enable_highlights: true }).eq("id", video.id);
    video.enable_highlights = true;
  }
  await runHighlightCuration(db, video, project, beats);
  return { ok: true };
}

/** Persist operator edits to the curated highlights. */
export async function saveHighlights(opts: {
  videoId: string;
  highlights: CuratedHighlight[];
}): Promise<EngineResult> {
  const db = await createClient();
  const { error } = await db
    .from("videos")
    .update({ highlights: opts.highlights })
    .eq("id", opts.videoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Resolve a gate decision, then let the engine continue. */
/**
 * Kill a video from ANY status (not just an open gate). decideGate requires an
 * open gate, so it couldn't kill APPROVED / TRACKING / drivable / paused
 * videos — the publish-stage "Kill" silently failed. This works everywhere:
 * it marks the video KILLED (a soft delete that getVideos then excludes, so it
 * drops out of every count and list) and records the kill for audit when the
 * video is at a gate. Idempotent.
 */
export async function killVideo(videoId: string, dbArg?: Db): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (video.status === "KILLED") return { ok: true };
  const gate = GATE_FOR_STATUS[video.status];
  // approvals.gate is NOT NULL, so only record an approval when at a gate;
  // otherwise the status change to KILLED is the record.
  if (gate) {
    await db.from("approvals").insert({
      video_id: videoId,
      gate,
      decision: "killed",
      decided_by: "human",
      decided_at: new Date().toISOString(),
    });
  }
  await setStatus(db, videoId, "KILLED");
  return { ok: true };
}

/**
 * Autonomous re-script from a FINAL structural failure (Auto-Rescript spec,
 * Self-Watch Layer 2 follow-up). Mirrors the proven script-stage auto-revision
 * mechanism: record the brief as a revision approval (latestNotes reads the
 * newest revision regardless of gate), rewrite the script, then re-arm the
 * full-auto continuation so the video re-flows SCRIPT_READY → assets → render.
 * Bounds/kill-switches live at the call site (autofix.ts); this is the
 * primitive.
 */
export async function autoRescriptFromFinal(
  db: Db,
  video: Video,
  project: Project,
  brief: string,
): Promise<EngineResult> {
  if (video.status !== "FINAL_REVIEW") return { ok: false, error: "not at final review" };
  await db.from("approvals").insert({
    video_id: video.id,
    gate: "SCRIPT",
    decision: "revision",
    decided_by: "autopilot",
    notes: brief.slice(0, 2000),
    decided_at: new Date().toISOString(),
  });
  await runScripting(db, video, project); // reads latestNotes → new version → SCRIPT_READY
  // Re-arm the full-auto continuation (build-runner/cron drives SCRIPT_READY on).
  await db
    .from("videos")
    .update({ auto_finish: true, paused_reason: null })
    .eq("id", video.id);
  return { ok: true };
}

export async function decideGate(
  opts: {
    videoId: string;
    decision: "approved" | "revision" | "killed";
    notes?: string;
  },
  dbArg?: Db,
  decidedBy: "human" | "mcp" | "autopilot" = "human",
): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  const director = isDirectorMode(project);

  const gate = GATE_FOR_STATUS[video.status];
  if (!gate) return { ok: false, error: `No open gate for status ${video.status}` };

  // Cost-aware revision cap (hybrid): count prior human/MCP revisions on this
  // video; hard-block beyond the cap, warn as it approaches. Auto-pilot's own
  // single revision (decided_by 'autopilot') is exempt. Director Mode has NO
  // revision caps (spec §1 decision 7): the operator revises unlimited times.
  let revisionWarning: string | undefined;
  if (opts.decision === "revision" && decidedBy !== "autopilot" && !director) {
    const { count } = await db
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("video_id", video.id)
      .eq("decision", "revision")
      .in("decided_by", ["human", "mcp"]);
    const priorRevisions = count ?? 0;
    const spent = Number(video.total_cost_usd ?? 0).toFixed(2);
    const caps = await getQualityGateConfig(db);
    if (priorRevisions >= caps.revisionHardCap) {
      return {
        ok: false,
        error: `Revision limit reached (${caps.revisionHardCap} revisions, $${spent} spent on this video). Approve, kill, or step back manually instead of revising again.`,
      };
    }
    if (priorRevisions + 1 >= caps.revisionWarnAt) {
      revisionWarning = `This is revision #${priorRevisions + 1} ($${spent} spent so far). Each revision re-bills the regenerated beats.`;
    }
  }

  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: opts.decision,
    decided_by: decidedBy,
    notes: opts.notes ?? null,
    decided_at: new Date().toISOString(),
  });

  if (opts.decision === "killed") {
    await setStatus(db, video.id, "KILLED");
    return { ok: true };
  }

  if (opts.decision === "revision") {
    // Visible NEEDS_REVISION blip, then loop back to the prior stage with
    // the notes injected by the stage body.
    await setStatus(db, video.id, "NEEDS_REVISION");
    await sleep(400);
    const target = REVISION_TARGET[gate];
    if (gate === "IDEA") {
      // Revising an idea sharpens it in place rather than re-running a stage.
      await db
        .from("videos")
        .update({ status: target, topic: video.topic })
        .eq("id", video.id);
      return { ok: true, warning: revisionWarning };
    }
    await setStatus(db, video.id, target);
    const r = await runPipeline(video.id, db);
    return { ...r, warning: revisionWarning ?? r.warning };
  }

  const next = ON_APPROVE[video.status];
  if (!next) return { ok: false, error: "No approve transition" };
  // Approving past a gate resolves any hold that was on it — clear the stale
  // paused_reason so an approved video doesn't carry an old "Auto-fix held"
  // (or budget/error) note forward into the Ready-to-publish section.
  await db
    .from("videos")
    .update({ status: next, paused_reason: null })
    .eq("id", video.id);
  // Director Mode: advancing a gate moves the status only — it never chains
  // into the next stage body. The operator triggers the next stage explicitly
  // via runDirectedStage (one press = one action). runPipeline would no-op for
  // a director project anyway; returning here keeps the intent explicit.
  if (director) return { ok: true };
  return runPipeline(video.id, db);
}
