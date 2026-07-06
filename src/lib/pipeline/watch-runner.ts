import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryMemory, writeMemory } from "@/lib/pipeline/memory-service";
import { getQualityGateConfig } from "@/lib/pipeline/quality-gates";
import { recordCost as ledgerRecordCost } from "@/lib/pipeline/ledger";
import { getSignedMediaUrl } from "@/lib/storage";
import { judgeCompetitiveFit, type CompetitiveContext } from "@/lib/adapters/competitive-judge";
import { assessTransitions, isTemporalLive } from "@/lib/adapters/transition-critic";
import {
  assembleVerdict,
  checkTransitions,
  foldTemporal,
  transitionBoundaries,
  WATCH_RUBRIC,
  type CompetitiveInput,
  type WatchBeat,
  type WatchClip,
  type WatchDimensionResult,
  type WatchInputs,
  type WatchThresholds,
  type WatchVerdict,
} from "@/lib/pipeline/watch-gate";
import type { OperatorStrategy, Project, Video } from "@/lib/db/types";

/**
 * Self-Watch gate runner (Fable5-Self-Watch-Loop-Plan.md, Phases 0–2). Scores
 * the assembled render with the pure core, reads the C8 `quality` namespace for
 * graduated lessons, writes recurring failures back as SHADOW lessons, and — when
 * `competitive` is requested — runs the LLM competitive-fit judge (#4) against
 * stored context. Best-effort; stores the verdict on `videos.watch_review`.
 *
 * The competitive judge is an LLM call, so it runs only at the operator's settle
 * point (`competitive: true`), NOT on every cheap structural pass the autofix
 * loop makes (`competitive: false`, the default).
 */

type Db = ReturnType<typeof createAdminClient>;

type BeatTimeline = { idx: number; start: number; end: number };
type ScriptBeat = { idx: number; text?: string; shotType?: string };

async function loadScriptBeats(db: Db, videoId: string): Promise<ScriptBeat[]> {
  const { data } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.beats ?? []) as ScriptBeat[];
}

async function gatherInputs(db: Db, video: Video, scriptBeats: ScriptBeat[]): Promise<WatchInputs | null> {
  const { data: renders } = await db
    .from("assets")
    .select("meta, created_at")
    .eq("video_id", video.id)
    .eq("kind", "render")
    .order("created_at", { ascending: false })
    .limit(1);
  const rmeta = ((renders ?? [])[0]?.meta ?? {}) as {
    beats?: BeatTimeline[];
    durationSec?: number;
    mediaQc?: { ran?: boolean; checks?: { id: string; pass: boolean }[] };
  };
  const timeline = Array.isArray(rmeta.beats) ? rmeta.beats : [];
  if (timeline.length === 0) return null; // not rendered / no timeline → nothing to watch yet

  const byIdx = new Map(scriptBeats.map((b) => [b.idx, b]));
  const beats: WatchBeat[] = timeline.map((b) => ({
    idx: b.idx,
    start: Number(b.start ?? 0),
    end: Number(b.end ?? 0),
    narrated: Boolean((byIdx.get(b.idx)?.text ?? "").trim()) || !byIdx.has(b.idx),
    shotType: byIdx.get(b.idx)?.shotType,
  }));

  const { data: clipRows } = await db
    .from("assets")
    .select("beat_index, meta")
    .eq("video_id", video.id)
    .eq("kind", "clip");
  const clips: WatchClip[] = ((clipRows ?? []) as { beat_index: number | null; meta: Record<string, unknown> }[])
    .filter((c) => c.beat_index != null)
    .map((c) => {
      const rel = (c.meta as { relevance?: { score?: number } }).relevance;
      return { beatIdx: c.beat_index as number, relevance: typeof rel?.score === "number" ? rel.score : null };
    });

  const silenceCheck = (rmeta.mediaQc?.checks ?? []).find((c) => c.id === "silence");
  const silencePass = rmeta.mediaQc?.ran ? (silenceCheck ? silenceCheck.pass : true) : null;

  return {
    targetLengthSec: Number(video.target_length_sec ?? 0),
    durationSec: Number(rmeta.durationSec ?? 0),
    captionsOn: Boolean(video.enable_captions),
    beats,
    clips,
    silencePass,
  };
}

/** A signed URL for the latest rendered MP4 (for the temporal pass); null when
    the render is a mock or unavailable. */
async function renderSignedUrl(db: Db, videoId: string): Promise<string | null> {
  const { data } = await db
    .from("assets")
    .select("storage_path")
    .eq("video_id", videoId)
    .eq("kind", "render")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const path = (data as { storage_path?: string } | null)?.storage_path;
  return path ? getSignedMediaUrl(path, 1800) : null;
}

/** Our channel's winning subtopics from the operator's learned strategy. */
async function loadWinners(db: Db, video: Video, project: Project): Promise<string[]> {
  let config: { strategy?: OperatorStrategy } | null = null;
  if (video.operator_run_id) {
    const { data } = await db.from("operator_runs").select("config").eq("id", video.operator_run_id).maybeSingle();
    config = (data?.config ?? null) as { strategy?: OperatorStrategy } | null;
  }
  if (!config) {
    const { data } = await db
      .from("operator_runs")
      .select("config")
      .eq("project_id", project.id)
      .eq("status", "active")
      .maybeSingle();
    config = (data?.config ?? null) as { strategy?: OperatorStrategy } | null;
  }
  return config?.strategy?.topSubtopics ?? [];
}

/** Build the competitive dimension via the LLM judge against stored context. */
async function judgeCompetitive(
  db: Db,
  video: Video,
  project: Project,
  scriptBeats: ScriptBeat[],
  beatCount: number,
  floor: number,
): Promise<CompetitiveInput> {
  const [winners, intel, compHits, outcomeHits] = await Promise.all([
    loadWinners(db, video, project),
    db.from("video_intel").select("blueprint").eq("video_id", video.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    queryMemory(db, { namespace: "competitive", projectId: project.id, query: `${project.niche ?? ""} ${video.topic ?? ""}`.trim(), k: 4 }),
    queryMemory(db, { namespace: "outcome", projectId: project.id, query: `${project.niche ?? ""} ${video.topic ?? ""}`.trim(), k: 4 }),
  ]);

  const ctx: CompetitiveContext = {
    title: video.title,
    topic: video.topic,
    niche: project.niche,
    angle: (video as { angle?: string }).angle,
    hook: (scriptBeats[0]?.text ?? "").slice(0, 400),
    beatCount,
    targetLengthSec: Number(video.target_length_sec ?? 0),
    ourWinners: winners,
    blueprint: (intel.data?.blueprint ?? null) as CompetitiveContext["blueprint"],
    memoryLessons: [...compHits, ...outcomeHits].map((h) => h.text),
  };

  const judged = await judgeCompetitiveFit(ctx, floor);
  if (judged.costUsd > 0) {
    try {
      await ledgerRecordCost(db, video, { provider: "anthropic", usd: judged.costUsd, description: "Self-Watch competitive judge" });
    } catch {
      /* ledger best-effort */
    }
  }
  return { result: judged.dimension, policyRisk: judged.policyRisk, suggestions: judged.suggestions };
}

export async function runWatchGate(
  db: Db,
  video: Video,
  project: Project,
  opts?: { competitive?: boolean },
): Promise<WatchVerdict | null> {
  try {
    const cfg = await getQualityGateConfig(db);
    const scriptBeats = await loadScriptBeats(db, video.id);
    const inputs = await gatherInputs(db, video, scriptBeats);
    if (!inputs) return null;

    // READ the quality namespace — graduated lessons for this niche/topic (C8).
    // Only at the settle point (it embeds the query); the autofix loop's cheap
    // passes don't need it (they consume fixPlan, not appliedLessons).
    let appliedLessons: string[] = [];
    if (opts?.competitive) {
      try {
        const hits = await queryMemory(db, {
          namespace: "quality",
          projectId: project.id,
          query: `${project.niche ?? ""} ${video.topic ?? ""}`.trim(),
          k: 6,
        });
        appliedLessons = hits.map((h) => h.text);
      } catch {
        /* memory read is best-effort */
      }
    }

    const thresholds: WatchThresholds = {
      timingFloor: cfg.timingFloor,
      scriptMatchFloor: cfg.beatRelevanceFloor,
      transitionFloor: cfg.transitionFloor,
    };

    // Transitions (#1) — structural Tier-1 is pure/free and always runs.
    let transitions: WatchDimensionResult = checkTransitions(inputs, thresholds);

    // Competitive (#4) + temporal transitions (Tier-2) are paid/LLM passes, so
    // they run only at the settle point (`competitive: true`), not on every cheap
    // autofix pass.
    let competitive: CompetitiveInput | null = null;
    if (opts?.competitive) {
      try {
        competitive = await judgeCompetitive(db, video, project, scriptBeats, inputs.beats.length, cfg.competitiveFloor);
      } catch {
        /* competitive judge is best-effort */
      }
      try {
        const boundaries = transitionBoundaries(inputs.beats);
        if (boundaries.length >= cfg.watchTemporalEscalateAt && isTemporalLive()) {
          const url = await renderSignedUrl(db, video.id);
          if (url) {
            const temporal = await assessTransitions({ videoUrl: url, boundaries });
            if (temporal.costUsd > 0) {
              try {
                await ledgerRecordCost(db, video, { provider: "gemini", usd: temporal.costUsd, description: "Self-Watch temporal transitions" });
              } catch {
                /* ledger best-effort */
              }
            }
            transitions = foldTemporal(transitions, temporal, cfg.transitionFloor);
          }
        }
      } catch {
        /* temporal pass is best-effort */
      }
    }

    const verdict = assembleVerdict(
      inputs,
      thresholds,
      new Date().toISOString(),
      appliedLessons,
      competitive,
      transitions,
    );

    await db.from("videos").update({ watch_review: verdict }).eq("id", video.id);

    // WRITE recurring failures as SHADOW lessons — the shadow→graduate lifecycle
    // (C8): non-gating until graduation. Only at the once-per-video settle point
    // (`competitive`), NEVER on the autofix loop's repeated passes — otherwise one
    // video re-rendering N times would inflate evidenceCount N× and graduate a
    // lesson that only ONE video tripped. Recurrence must mean distinct videos.
    // isSameLesson reinforcement dedups across videos (the graduation signal).
    if (opts?.competitive) try {
      const failing = [...verdict.timing.issues, ...verdict.scriptMatch.issues, ...verdict.competitive.issues, ...verdict.transitions.issues];
      const seen = new Set<string>();
      for (const iss of failing) {
        if (seen.has(iss.criterion)) continue; // one shadow lesson per criterion per render
        seen.add(iss.criterion);
        const crit = WATCH_RUBRIC.find((c) => c.key === iss.criterion);
        await writeMemory(db, {
          namespace: "quality",
          status: "shadow",
          scope: { tier: "channel", projectId: project.id },
          text: `Watch out for: ${crit?.label ?? iss.criterion}`,
          evidence: `flagged on "${video.title}"`,
          confidence: 0.3,
        });
      }
    } catch {
      /* memory write is best-effort */
    }

    return verdict;
  } catch (err) {
    console.error("watch gate failed (non-fatal):", err);
    return null;
  }
}
