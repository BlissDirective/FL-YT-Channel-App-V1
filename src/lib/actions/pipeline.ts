"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addBeat,
  applyPressKitClip,
  applyScriptRemix,
  applySourceClip,
  startBuildRun,
  type BuildRunConfig,
  autoClassifyShotTypes,
  decideGate,
  killVideo,
  deleteBeat,
  editScriptBeat,
  editVideoMetadata,
  enqueueLongClip,
  fullAutoGenerate,
  generateBeatVideo,
  mergeBeats,
  moveBeat,
  proposeBeatRemix,
  proposeScriptRemix,
  rerollBeatVisual,
  rerollStickScene,
  setStickScene,
  regenerateScript,
  runPipeline,
  setBeatShotType,
  setCaptionsEnabled,
  setHighlightOptions,
  stepBackStage,
  curateHighlightsForVideo,
  saveHighlights,
  type ClassifyResult,
  type EnqueueResult,
  type FullAutoResult,
  type VideoGenResult,
} from "@/lib/pipeline/engine";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import { getKillSwitch } from "@/lib/db/queries";
import { rankCandidates, searchSources, type SourceCandidate } from "@/lib/adapters/sources";
import type { RemixSettings, ScriptRemix } from "@/lib/adapters/script";
import type { CuratedHighlight, CustomSpec, ScriptBeat } from "@/lib/db/types";
import { SHORT_LENGTHS } from "@/lib/db/types";
import { DEMO_TOPICS } from "@/lib/pipeline/mock-content";

export type PipelineResult = { ok: boolean; error?: string };

function refresh(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath("/settings");
}

/** Server-action exceptions reach clients as opaque digests in production;
    convert them to readable inline errors instead. */
async function guarded(fn: () => Promise<PipelineResult>): Promise<PipelineResult> {
  try {
    return await fn();
  } catch (err) {
    console.error("pipeline action failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function approveGateAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await decideGate({ videoId, decision: "approved" });
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

export async function requestRevisionAction(
  projectId: string,
  videoId: string,
  notes: string,
): Promise<PipelineResult> {
  if (!notes.trim()) return { ok: false, error: "Add a note so the revision has direction." };
  return guarded(async () => {
    const result = await decideGate({ videoId, decision: "revision", notes: notes.trim() });
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

export async function killVideoAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    // killVideo (not decideGate) so a video can be killed from ANY status —
    // including the publish stage (APPROVED), which has no open gate.
    const result = await killVideo(videoId);
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

/** Retry a paused video (after raising a budget cap or clearing the kill
    switch) — picks up from wherever it stopped. */
export async function resumeVideoAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await runPipeline(videoId);
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

/** Phase 6 UI — one-tap "Retry render" for videos held after the render farm
    exhausted its attempts. Clears paused_reason (status stays ASSEMBLING) so
    the farm re-picks the video on its next sweep. */
export async function resetRenderAttemptsAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("videos")
      .update({ paused_reason: null })
      .eq("id", videoId);
    if (error) return { ok: false, error: error.message };
    refresh(projectId);
    return { ok: true };
  });
}

/** Launch a Full-Auto Build & Post run (Phase 0): create the run + N seed
    videos; the build-runner cron drives them through to Final review. */
export async function startBuildRunAction(
  projectId: string,
  config: BuildRunConfig,
): Promise<PipelineResult & { runId?: string; created?: number }> {
  try {
    const r = await startBuildRun(projectId, config);
    if (!r.ok) return { ok: false, error: r.error };
    refresh(projectId);
    return { ok: true, runId: r.runId, created: r.created };
  } catch (err) {
    console.error("startBuildRun failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Send a video back one stage to the previous gate (e.g. asset generation →
    script approval). `deleteAssets` discards the already-generated assets;
    otherwise they're kept (VO is cached either way). */
export async function stepBackStageAction(
  projectId: string,
  videoId: string,
  deleteAssets: boolean,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await stepBackStage({ videoId, deleteAssets });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

/** "Run demo pipeline" — queues a fresh mock video at the IDEA gate. */
export async function runDemoPipelineAction(projectId: string): Promise<PipelineResult> {
  return guarded(() => runDemoPipeline(projectId));
}

async function runDemoPipeline(projectId: string): Promise<PipelineResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);
  const pick = DEMO_TOPICS[(count ?? 0) % DEMO_TOPICS.length];

  const { data: video, error } = await supabase
    .from("videos")
    .insert({
      project_id: projectId,
      title: pick.title,
      topic: pick.topic,
      format: pick.format,
      status: "IDEA",
    })
    .select("id")
    .single();
  if (error || !video) return { ok: false, error: error?.message ?? "Insert failed" };

  await supabase.from("ideas").insert({
    project_id: projectId,
    title: pick.title,
    angle: `Demo pipeline run — ${pick.topic}`,
    score: 8.1,
    flag: "HIGH_VALUE",
    source: { views: 412000, channelSubs: 67000 },
  });

  // Lands on the IDEA gate: notifies + honors Autopilot.
  const result = await runPipeline(video.id);
  refresh(projectId);
  return { ok: result.ok, error: result.error };
}

/** "Queue topic" — start a real video from a typed topic (Phase 4). */
export async function queueTopicAction(
  projectId: string,
  topic: string,
  opts?: { kind?: "long" | "short"; targetLengthSec?: number },
): Promise<PipelineResult> {
  const clean = topic.trim();
  if (!clean) return { ok: false, error: "Type a topic first." };
  const isShort = opts?.kind === "short";
  // Shorts target one of the offered lengths; long-form keeps the project default.
  const targetLengthSec = (SHORT_LENGTHS as readonly number[]).includes(opts?.targetLengthSec ?? 0)
    ? opts!.targetLengthSec!
    : 60;
  return guarded(async () => {
    const supabase = await createClient();
    const title = clean
      .replace(/\s+/g, " ")
      .replace(/^./, (c) => c.toUpperCase());
    const { data: video, error } = await supabase
      .from("videos")
      .insert({
        project_id: projectId,
        title,
        topic: clean,
        status: "IDEA",
        ...(isShort ? { kind: "short", target_length_sec: targetLengthSec } : {}),
      })
      .select("id")
      .single();
    if (error || !video) return { ok: false, error: error?.message ?? "Insert failed" };
    const result = await runPipeline(video.id);
    refresh(projectId);
    return { ok: result.ok, error: result.error };
  });
}

export async function editScriptBeatAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  text: string,
): Promise<PipelineResult> {
  if (!text.trim()) return { ok: false, error: "Beat text cannot be empty." };
  return guarded(async () => {
    const result = await editScriptBeat({ videoId, beatIdx, text: text.trim() });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    refresh(projectId);
    return result;
  });
}

// ── Beat shot-type ────────────────────────────────────────────────────

export async function setBeatShotTypeAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  shotType: ScriptBeat["shotType"],
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await setBeatShotType({ videoId, beatIdx, shotType });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  });
}

export async function autoClassifyShotTypesAction(
  projectId: string,
  videoId: string,
): Promise<ClassifyResult> {
  try {
    const r = await autoClassifyShotTypes({ videoId });
    if (r.ok) revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  } catch (err) {
    console.error("autoClassifyShotTypesAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Section (storyboard) editing ──────────────────────────────────────

const sectionRefresh = (projectId: string, videoId: string) => {
  revalidatePath(`/projects/${projectId}/videos/${videoId}`);
};

export async function addSectionAction(
  projectId: string,
  videoId: string,
  afterIdx: number,
  mode: "visual" | "narrated",
): Promise<PipelineResult> {
  return guarded(async () => {
    const beat =
      mode === "visual"
        ? { text: "", visualPrompt: "New B-roll moment — describe the visual.", shotType: "broll" as const }
        : { text: "New section — write the narration here.", visualPrompt: "New section visual.", shotType: "broll" as const };
    const r = await addBeat({ videoId, afterIdx, beat });
    sectionRefresh(projectId, videoId);
    return r;
  });
}

export async function deleteSectionAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await deleteBeat({ videoId, beatIdx });
    sectionRefresh(projectId, videoId);
    return r;
  });
}

export async function moveSectionAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  dir: "up" | "down",
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await moveBeat({ videoId, beatIdx, dir });
    sectionRefresh(projectId, videoId);
    return r;
  });
}

export async function mergeSectionsAction(
  projectId: string,
  videoId: string,
  startIdx: number,
  endIdx: number,
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await mergeBeats({ videoId, startIdx, endIdx });
    sectionRefresh(projectId, videoId);
    return r;
  });
}

// ── Long-clip jobs (Veo-extend / auto-stitch) ─────────────────────────

export async function enqueueLongClipAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  method: "veo-extend" | "stitch" | "stitch-seamless",
  model: string,
  targetSec: number,
  estCostUsd: number,
): Promise<EnqueueResult> {
  try {
    const r = await enqueueLongClip({ videoId, beatIdx, method, model, targetSec, estCostUsd });
    if (r.ok) revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  } catch (err) {
    console.error("enqueueLongClipAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fullAutoGenerateAction(
  projectId: string,
  videoId: string,
  tier: AutoTier,
  custom?: CustomSpec,
): Promise<FullAutoResult> {
  try {
    const r = await fullAutoGenerate({ videoId, tier, custom });
    if (r.ok) {
      revalidatePath(`/projects/${projectId}/videos/${videoId}`);
      refresh(projectId);
    }
    return r;
  } catch (err) {
    console.error("fullAutoGenerateAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Persist a Custom-tier recipe as the project's reusable default. */
export async function saveCustomSpecAction(
  projectId: string,
  spec: CustomSpec,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .update({ custom_spec: spec })
      .eq("id", projectId);
    if (error) return { ok: false, error: error.message };
    refresh(projectId);
    return { ok: true };
  } catch (err) {
    console.error("saveCustomSpecAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Phase B — generated video clips ───────────────────────────────────

export async function generateBeatVideoAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  modelId: string,
  durationSec: number,
): Promise<VideoGenResult> {
  try {
    if (await getKillSwitch()) {
      return { ok: false, error: "Pipeline is paused (kill switch is on)." };
    }
    const r = await generateBeatVideo({ videoId, beatIdx, modelId, durationSec });
    if (r.ok) {
      revalidatePath(`/projects/${projectId}/videos/${videoId}`);
      refresh(projectId);
    }
    return r;
  } catch (err) {
    console.error("generateBeatVideoAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Script Remix ──────────────────────────────────────────────────────

export type RemixActionResult =
  | { ok: true; remix: ScriptRemix }
  | { ok: false; error: string };
export type BeatRemixActionResult =
  | { ok: true; beat: ScriptBeat; changeSummary: string }
  | { ok: false; error: string };

/** Propose a whole-script remix from chat notes + settings (no persistence). */
export async function remixScriptAction(
  _projectId: string,
  videoId: string,
  notes: string,
  settings: RemixSettings,
): Promise<RemixActionResult> {
  if (!notes.trim()) return { ok: false, error: "Add a note describing the remix you want." };
  try {
    const r = await proposeScriptRemix({ videoId, notes: notes.trim(), settings });
    return r.ok ? { ok: true, remix: r.remix } : r;
  } catch (err) {
    console.error("remixScriptAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Propose a single-section remix (no persistence). */
export async function remixBeatAction(
  _projectId: string,
  videoId: string,
  beatIdx: number,
  notes: string,
  settings: RemixSettings,
): Promise<BeatRemixActionResult> {
  if (!notes.trim()) return { ok: false, error: "Add a note describing the remix you want." };
  try {
    const r = await proposeBeatRemix({ videoId, beatIdx, notes: notes.trim(), settings });
    return r.ok
      ? { ok: true, beat: r.remix.beat, changeSummary: r.remix.changeSummary }
      : r;
  } catch (err) {
    console.error("remixBeatAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Accept a proposed whole-script remix → persist as a new script version. */
export async function applyScriptRemixAction(
  projectId: string,
  videoId: string,
  remix: Pick<ScriptRemix, "beats" | "runtimeSec" | "metadata">,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await applyScriptRemix({
      videoId,
      beats: remix.beats,
      runtimeSec: remix.runtimeSec,
      metadata: remix.metadata,
    });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    refresh(projectId);
    return result;
  });
}

export async function editVideoMetadataAction(
  projectId: string,
  videoId: string,
  title: string,
  description: string,
): Promise<PipelineResult> {
  if (!title.trim()) return { ok: false, error: "Title cannot be empty." };
  return guarded(async () => {
    const result = await editVideoMetadata({
      videoId,
      title: title.trim(),
      description,
    });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    refresh(projectId);
    return result;
  });
}

// ── Kinetic Highlights ────────────────────────────────────────────────

export async function setHighlightOptionsAction(
  projectId: string,
  videoId: string,
  enabled: boolean,
  count: number,
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await setHighlightOptions({ videoId, enabled, count });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  });
}

export async function setCaptionsEnabledAction(
  projectId: string,
  videoId: string,
  enabled: boolean,
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await setCaptionsEnabled({ videoId, enabled });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  });
}

export async function curateHighlightsAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await curateHighlightsForVideo({ videoId });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  });
}

export async function saveHighlightsAction(
  projectId: string,
  videoId: string,
  highlights: CuratedHighlight[],
): Promise<PipelineResult> {
  return guarded(async () => {
    const r = await saveHighlights({ videoId, highlights });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return r;
  });
}

/** Phase 6.5 — search compliant sources for a beat and return Claude-ranked
    candidates with verified licence metadata. */
export async function findFootageAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  queryOverride?: string,
): Promise<PipelineResult & { candidates?: SourceCandidate[] }> {
  return guarded(async () => {
    const supabase = await createClient();
    const { data: script } = await supabase
      .from("scripts")
      .select("beats")
      .eq("video_id", videoId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const beat = ((script?.beats ?? []) as { idx: number; text: string; visualPrompt: string }[]).find(
      (b) => b.idx === beatIdx,
    );
    if (!beat) return { ok: false, error: "Beat not found" };

    const query = (queryOverride?.trim() || beat.visualPrompt || beat.text).slice(0, 100);
    const found = await searchSources(query);
    if (found.length === 0) {
      return {
        ok: false,
        error: `No compliant footage found for “${query}”. Try a broader or more concrete search.`,
      };
    }
    const ranked = await rankCandidates({
      beatText: beat.text,
      visualPrompt: beat.visualPrompt,
      candidates: found,
    });
    return { ok: true, candidates: ranked.slice(0, 12) };
  });
}

/** Phase 6.5 — apply a chosen licensed candidate to a beat. */
export async function applySourceClipAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  candidate: SourceCandidate,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await applySourceClip({ videoId, beatIdx, candidate });
    refresh(projectId);
    return result;
  });
}

/** Gaming-compliant lane (Phase 10): attach an official press-kit / own-capture
    asset to a beat by URL — manually gated, never autonomous. */
export async function addPressKitAssetAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  asset: { url: string; title: string; author: string; sourceUrl?: string; kind: "image" | "video" },
): Promise<PipelineResult> {
  if (!asset.url?.trim()) return { ok: false, error: "Paste the asset URL." };
  if (!asset.title?.trim()) return { ok: false, error: "Add a short title for the credit line." };
  return guarded(async () => {
    const result = await applyPressKitClip({
      videoId,
      beatIdx,
      url: asset.url.trim(),
      title: asset.title.trim(),
      author: asset.author.trim(),
      sourceUrl: asset.sourceUrl?.trim(),
      kind: asset.kind,
    });
    refresh(projectId);
    return result;
  });
}

/** Reroll one beat's visual at the Assets gate (idea #3). */
export async function rerollBeatVisualAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  note?: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await rerollBeatVisual({ videoId, beatIdx, note });
    refresh(projectId);
    return result;
  });
}

/** Regenerate a script that came back empty (zero beats). */
export async function regenerateScriptAction(
  projectId: string,
  videoId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await regenerateScript({ videoId });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    refresh(projectId);
    return result;
  });
}

/** Stick Studio: re-choreograph one beat's scene (optionally steered by a note). */
export async function rerollStickSceneAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  note?: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await rerollStickScene({ videoId, beatIdx, note });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return result;
  });
}

/** Stick Studio: operator override of one beat's scene (action/setting/mood). */
export async function setStickSceneAction(
  projectId: string,
  videoId: string,
  beatIdx: number,
  patch: { action?: string; setting?: string; mood?: string },
): Promise<PipelineResult> {
  return guarded(async () => {
    const result = await setStickScene({ videoId, beatIdx, ...patch });
    revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return result;
  });
}

/** Crown one thumbnail candidate (idea #4 — selection feeds the render
    and, in Phase 7, the Publish Kit's Test & Compare package). */
export async function selectThumbnailAction(
  projectId: string,
  videoId: string,
  assetId: string,
): Promise<PipelineResult> {
  return guarded(async () => {
    const supabase = await createClient();
    const { data: thumbs } = await supabase
      .from("assets")
      .select("id, meta")
      .eq("video_id", videoId)
      .eq("kind", "thumb");
    for (const t of thumbs ?? []) {
      await supabase
        .from("assets")
        .update({ meta: { ...(t.meta as object), selected: t.id === assetId } })
        .eq("id", t.id);
    }
    refresh(projectId);
    return { ok: true };
  });
}

/** Save a new active version of a project's prompt template. */
export async function saveTemplateAction(
  projectId: string,
  kind: string,
  body: string,
): Promise<PipelineResult> {
  if (!body.trim()) return { ok: false, error: "Template cannot be empty." };
  return guarded(async () => {
    const supabase = await createClient();
    const { data: latest } = await supabase
      .from("prompt_templates")
      .select("version")
      .eq("project_id", projectId)
      .eq("kind", kind)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase
      .from("prompt_templates")
      .update({ active: false })
      .eq("project_id", projectId)
      .eq("kind", kind);
    const { error } = await supabase.from("prompt_templates").insert({
      project_id: projectId,
      kind,
      version: (latest?.version ?? 0) + 1,
      body: body.trim(),
      active: true,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/settings`);
    return { ok: true };
  });
}

// ── Quality gates (Phase 6 UI) ────────────────────────────────────────

export type QualityGates = {
  ideaFloor?: number;
  revisionHardCap?: number;
  qcLessonBelow?: number;
  seedVisionFloor?: number;
  varietyMinDistance?: number;
  autofixThreshold?: number;
  runFloor?: number;
  runPublic?: number;
  factRiskMax?: number;
  beatRelevanceFloor?: number;
  timingFloor?: number;
  watchBlockPublishBelow?: number;
  competitiveFloor?: number;
  playbookShadowMinEvidence?: number;
  playbookAutoGraduateConfidence?: number;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Persist operator-tuned quality-gate thresholds to app_settings. Values are
    clamped to sane ranges so a typo can't wedge the pipeline. */
export async function saveQualityGatesAction(
  gates: QualityGates,
): Promise<PipelineResult> {
  const score = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? clamp(n, 0, 10) : undefined;
  const value: QualityGates = {
    ideaFloor: score(gates.ideaFloor),
    revisionHardCap:
      typeof gates.revisionHardCap === "number" && Number.isFinite(gates.revisionHardCap)
        ? clamp(Math.round(gates.revisionHardCap), 1, 10)
        : undefined,
    qcLessonBelow: score(gates.qcLessonBelow),
    seedVisionFloor: score(gates.seedVisionFloor),
    varietyMinDistance:
      typeof gates.varietyMinDistance === "number" && Number.isFinite(gates.varietyMinDistance)
        ? clamp(Math.round(gates.varietyMinDistance), 0, 32)
        : undefined,
    autofixThreshold: score(gates.autofixThreshold),
    runFloor: score(gates.runFloor),
    runPublic: score(gates.runPublic),
    factRiskMax: score(gates.factRiskMax),
    beatRelevanceFloor: score(gates.beatRelevanceFloor),
    timingFloor: score(gates.timingFloor),
    watchBlockPublishBelow: score(gates.watchBlockPublishBelow),
    competitiveFloor: score(gates.competitiveFloor),
    playbookShadowMinEvidence:
      typeof gates.playbookShadowMinEvidence === "number" && Number.isFinite(gates.playbookShadowMinEvidence)
        ? clamp(Math.round(gates.playbookShadowMinEvidence), 1, 50)
        : undefined,
    playbookAutoGraduateConfidence:
      typeof gates.playbookAutoGraduateConfidence === "number" && Number.isFinite(gates.playbookAutoGraduateConfidence)
        ? clamp(gates.playbookAutoGraduateConfidence, 0, 1)
        : undefined,
  };
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "quality_gates", value });
  revalidatePath("/settings");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setKillSwitchAction(
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "kill_switch", value: { enabled } });
  revalidatePath("/settings");
  revalidatePath("/");
  // A safety control must never fail silently — the client reverts and
  // surfaces this instead of showing a flipped switch that didn't stick.
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<PipelineResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      user_agent: subscription.userAgent ?? "",
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error, error: error?.message };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/**
 * Harness C1 — the operator's agree/disagree on a QC verdict (the judge
 * calibration signal). One tap per review they were reading anyway; ~50
 * labels make the per-criterion agreement report meaningful.
 */
export async function labelQcReviewAction(opts: {
  qcReviewId: string;
  videoId: string;
  gate: string;
  agree: boolean;
  criterionId?: string;
  note?: string;
}): Promise<PipelineResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("judge_labels").insert({
    qc_review_id: opts.qcReviewId,
    video_id: opts.videoId,
    gate: opts.gate,
    agree: opts.agree,
    criterion_id: opts.criterionId ?? null,
    note: opts.note?.slice(0, 300) ?? null,
  });
  return { ok: !error, error: error?.message };
}
