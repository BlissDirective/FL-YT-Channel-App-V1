import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryMemory, writeMemory } from "@/lib/pipeline/memory-service";
import { getQualityGateConfig } from "@/lib/pipeline/quality-gates";
import {
  assembleVerdict,
  WATCH_RUBRIC,
  type WatchBeat,
  type WatchClip,
  type WatchInputs,
  type WatchVerdict,
} from "@/lib/pipeline/watch-gate";
import type { Project, Video } from "@/lib/db/types";

/**
 * Self-Watch gate runner (Fable5-Self-Watch-Loop-Plan.md, Phase 0–1). Gathers
 * the assembled render's structural data + the per-beat relevance verdicts the
 * visual gate already produced, scores them with the pure core, reads the C8
 * `quality` namespace for graduated lessons, and writes recurring failures back
 * as SHADOW lessons (non-gating until the outcome-audit graduates them). Stores
 * the verdict on `videos.watch_review`. Best-effort — never throws into the
 * caller; returns null when there's nothing to watch yet.
 */

type Db = ReturnType<typeof createAdminClient>;

type BeatTimeline = { idx: number; start: number; end: number };

async function gatherInputs(db: Db, video: Video): Promise<WatchInputs | null> {
  // The latest render asset carries the beat timeline, runtime, and media-QC.
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

  // Script beats → which timeline beats carry narration.
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const scriptBeats = (script?.beats ?? []) as { idx: number; text?: string }[];
  const narrated = new Map(scriptBeats.map((b) => [b.idx, Boolean((b.text ?? "").trim())]));

  const beats: WatchBeat[] = timeline.map((b) => ({
    idx: b.idx,
    start: Number(b.start ?? 0),
    end: Number(b.end ?? 0),
    narrated: narrated.get(b.idx) ?? true,
  }));

  // Clips + the per-beat narration-relevance verdict from the visual gate.
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

export async function runWatchGate(db: Db, video: Video, project: Project): Promise<WatchVerdict | null> {
  try {
    const cfg = await getQualityGateConfig(db);
    const inputs = await gatherInputs(db, video);
    if (!inputs) return null;

    // READ the quality namespace — graduated lessons for this niche/topic (C8).
    let appliedLessons: string[] = [];
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

    const verdict = assembleVerdict(
      inputs,
      { timingFloor: cfg.timingFloor, scriptMatchFloor: cfg.beatRelevanceFloor },
      new Date().toISOString(),
      appliedLessons,
    );

    await db.from("videos").update({ watch_review: verdict }).eq("id", video.id);

    // WRITE recurring failures as SHADOW lessons — the shadow→graduate lifecycle
    // (C8): non-gating until the outcome-audit confirms they predict retention.
    // isSameLesson reinforcement dedups and counts recurrence (the graduation
    // signal), so this is self-limiting rather than a per-render flood.
    try {
      const failing = [...verdict.timing.issues, ...verdict.scriptMatch.issues];
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
