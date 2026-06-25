import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { choreographStickScenes } from "@/lib/adapters/stick-choreographer";
import { reviewGate } from "@/lib/adapters/qc";
import { isTwelveLabsLive, wantsTemporalPass } from "@/lib/adapters/twelvelabs";
import { makeBeatClip } from "@/lib/pipeline/engine";
import {
  DEFAULT_STICK_CAST,
  type FrameCritique,
  type FrameIssue,
  type StickScene,
} from "@/lib/stick-types";
import type {
  AutofixConfig,
  AutofixLoop,
  AutofixMemory,
  AutofixState,
  Project,
  ScriptBeat,
  Video,
} from "@/lib/db/types";

// The loop always threads a service-role client (it runs under cron / the
// build-runner, where there is no operator session). RLS bypass is required.
type Db = ReturnType<typeof createAdminClient>;
type Loop = Exclude<AutofixLoop, "off">;

const DEFAULT_CONFIG: AutofixConfig = { threshold: 7, maxRenders: 2, spendCapUsd: 1 };

// ── Config / eligibility ──────────────────────────────────────────────

function configOf(project: Project): AutofixConfig {
  const c = project.autofix_config ?? DEFAULT_CONFIG;
  return {
    threshold: Number(c.threshold ?? DEFAULT_CONFIG.threshold),
    maxRenders: Number(c.maxRenders ?? DEFAULT_CONFIG.maxRenders),
    spendCapUsd: Number(c.spendCapUsd ?? DEFAULT_CONFIG.spendCapUsd),
  };
}

/** Resolve whether the loop runs for this video and which strategy. The
    per-video flag overrides the project default; the project's loop selection
    decides the strategy. */
export function resolveAutofix(
  project: Project,
  video: Video,
): { on: boolean; loop: Loop; config: AutofixConfig } {
  const loop = (project.autofix_loop ?? "off") as AutofixLoop;
  const enabled = video.autofix_enabled ?? project.autofix_enabled ?? false;
  const on = enabled && loop !== "off";
  return { on, loop: (loop === "off" ? "animation" : loop) as Loop, config: configOf(project) };
}

// ── Small DB helpers (all threaded through the admin client) ──────────

async function recordCost(
  db: Db,
  video: Video,
  provider: string,
  usd: number,
  description: string,
) {
  if (usd <= 0) return;
  await db.from("cost_ledger").insert({
    project_id: video.project_id,
    video_id: video.id,
    provider,
    description,
    usd,
  });
  await db
    .from("videos")
    .update({ total_cost_usd: Number(video.total_cost_usd) + usd })
    .eq("id", video.id);
  video.total_cost_usd = Number(video.total_cost_usd) + usd;
}

async function loadBeats(db: Db, videoId: string): Promise<ScriptBeat[]> {
  const { data } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.beats ?? []) as ScriptBeat[]) ?? [];
}

type Clip = { id: string; beat_index: number; meta: Record<string, unknown> };

async function loadClips(db: Db, videoId: string): Promise<Clip[]> {
  const { data } = await db
    .from("assets")
    .select("id, beat_index, meta")
    .eq("video_id", videoId)
    .eq("kind", "clip");
  return ((data ?? []) as Clip[]).map((c) => ({ ...c, meta: (c.meta ?? {}) as Record<string, unknown> }));
}

async function setState(db: Db, videoId: string, state: AutofixState) {
  await db.from("videos").update({ autofix_state: state }).eq("id", videoId);
}

// ── Memory (the "improves over time" brain — per project) ─────────────

function emptyMemory(): Required<Pick<AutofixMemory, "playbook" | "priors" | "antiPatterns" | "stats">> {
  return { playbook: [], priors: {}, antiPatterns: [], stats: { runs: 0, improved: 0, regressed: 0, avgDelta: 0 } };
}

/** Fold one finished attempt (its applied changes + the score delta it
    produced) into the project's learned memory. Improvements reinforce the
    playbook; regressions become anti-patterns the fixer is told to avoid. */
function foldMemory(mem: AutofixMemory, changes: string[], delta: number): AutofixMemory {
  const base = { ...emptyMemory(), ...mem };
  const playbook = [...(base.playbook ?? [])];
  const antiPatterns = [...(base.antiPatterns ?? [])];
  const stats = { ...emptyMemory().stats, ...(base.stats ?? {}) };
  if (delta >= 0.3) {
    for (const c of changes) {
      const lesson = `Worked (+${delta.toFixed(1)}): ${c}`;
      if (!playbook.some((p) => p.includes(c))) playbook.unshift(lesson);
    }
    stats.improved += 1;
  } else if (delta <= -0.3) {
    for (const c of changes) {
      if (!antiPatterns.includes(c)) antiPatterns.unshift(c);
    }
    stats.regressed += 1;
  }
  stats.runs += 1;
  stats.avgDelta = Math.round(((stats.avgDelta * (stats.runs - 1) + delta) / stats.runs) * 100) / 100;
  return {
    playbook: playbook.slice(0, 12),
    antiPatterns: antiPatterns.slice(0, 12),
    priors: base.priors ?? {},
    stats,
    updatedAt: new Date().toISOString(),
  };
}

async function saveMemory(db: Db, projectId: string, mem: AutofixMemory) {
  await db.from("projects").update({ autofix_memory: mem }).eq("id", projectId);
}

/** A compact steering line distilled from memory, fed to the fixer/choreographer. */
function memoryHint(mem: AutofixMemory): string {
  const lessons = (mem.playbook ?? []).slice(0, 4);
  const avoid = (mem.antiPatterns ?? []).slice(0, 3);
  const parts: string[] = [];
  if (lessons.length) parts.push(`Apply what worked before: ${lessons.join("; ")}`);
  if (avoid.length) parts.push(`Avoid: ${avoid.join("; ")}`);
  return parts.join(". ");
}

// ── Critique acquisition ──────────────────────────────────────────────

const SEV_WEIGHT: Record<string, number> = { high: 2, med: 1, low: 0 };

/** Animation reads the render farm's Tier-1 vision_review; AI-clip scores the
    final cut with the QC vision agent and writes a compatible critique. */
async function getCritique(
  db: Db,
  video: Video,
  project: Project,
  loop: Loop,
): Promise<FrameCritique | null> {
  if (loop === "animation") {
    return (video.vision_review as FrameCritique | null) ?? null;
  }
  // AI-clip: score the final cut with the QC agent and synthesise a critique
  // (a fresh timestamp each pass drives the state machine).
  const beats = await loadBeats(db, video.id);
  const clips = await loadClips(db, video.id);
  const review = await reviewGate({
    gate: "FINAL",
    context: {
      title: video.title,
      topic: video.topic,
      niche: project.niche,
      audience: project.audience,
      targetLengthSec: video.target_length_sec,
      captionsOn: video.enable_captions,
      beats: beats.map((b) => ({ idx: b.idx, text: b.text, visual: b.visualPrompt, shot: b.shotType })),
      visuals: clips.map((c) => ({ beat: c.beat_index, provider: (c.meta as { provider?: string }).provider })),
    },
  });
  if (review.costUsd > 0) await recordCost(db, video, "autofix:critique", review.costUsd, "Auto-fix QC critique");
  const issues: FrameIssue[] = (review.issues ?? []).map((note) => ({
    beatIdx: null,
    category: "other",
    severity: "med",
    note,
    fix: note,
  }));
  return {
    score: review.score,
    scores: { readability: review.score, composition: review.score, captions: review.score, consistency: review.score },
    issues,
    strengths: review.strengths ?? [],
    provider: review.costUsd > 0 ? "anthropic" : "mock",
    at: new Date().toISOString(),
  };
}

// ── Loop A: animation (Remotion / stick) fixers ───────────────────────

function reframe(scene: StickScene): StickScene {
  const zoom = Math.max(0.6, Math.min(1, (scene.camera?.zoom ?? 1) * 0.85));
  return {
    ...scene,
    shot: scene.shot === "close" ? "medium" : scene.shot,
    camera: { ...scene.camera, zoom, panX: 0 },
  };
}

function trimBubbles(scene: StickScene): StickScene {
  const clip = (s?: string) => (s && s.length > 22 ? `${s.slice(0, 21)}…` : s);
  return { ...scene, actors: scene.actors.map((a) => ({ ...a, say: clip(a.say), think: clip(a.think) })) };
}

function lockCast(scene: StickScene, project: Project): StickScene {
  const cast = project.stick_cast ?? DEFAULT_STICK_CAST;
  return { ...scene, actors: scene.actors.map((a) => ({ ...a, cast: { ...cast, ...a.cast } })) };
}

async function patchClip(db: Db, clip: Clip, scene: StickScene) {
  await db.from("assets").update({ meta: { ...clip.meta, stickScene: scene } }).eq("id", clip.id);
}

async function planAnimation(
  db: Db,
  video: Video,
  project: Project,
  critique: FrameCritique,
  mem: AutofixMemory,
): Promise<{ changes: string[]; costUsd: number; tier: "tier1" | "tier2" }> {
  const beats = await loadBeats(db, video.id);
  const clips = await loadClips(db, video.id);
  const byIdx = new Map(clips.map((c) => [c.beat_index, c]));
  const changes: string[] = [];
  let costUsd = 0;
  const hint = memoryHint(mem);
  const tier: "tier1" | "tier2" = isTwelveLabsLive() && wantsTemporalPass(critique) ? "tier2" : "tier1";

  // Highest-severity issues first; apply at most two coherent edits per render.
  const issues = [...(critique.issues ?? [])].sort(
    (a, b) => (SEV_WEIGHT[b.severity] ?? 0) - (SEV_WEIGHT[a.severity] ?? 0),
  );

  let consistencyDone = false;
  for (const iss of issues) {
    if (changes.length >= 2) break;
    const clip = iss.beatIdx != null ? byIdx.get(iss.beatIdx) : undefined;
    const scene = clip?.meta.stickScene as StickScene | undefined;

    if (iss.category === "consistency" && !consistencyDone) {
      // Lock the recurring character across every beat to kill style drift.
      for (const c of clips) {
        const s = c.meta.stickScene as StickScene | undefined;
        if (s) await patchClip(db, c, lockCast(s, project));
      }
      changes.push("Locked character consistency (colour/build) across all beats");
      consistencyDone = true;
      continue;
    }
    if (!clip || !scene) continue;

    if (iss.category === "composition") {
      await patchClip(db, clip, reframe(scene));
      changes.push(`Reframed beat ${iss.beatIdx! + 1} (zoom out, re-centre)`);
    } else if (iss.category === "captions") {
      await patchClip(db, clip, trimBubbles(scene));
      changes.push(`Tightened captions on beat ${iss.beatIdx! + 1}`);
    } else if (iss.category === "readability" || iss.category === "other") {
      // Re-choreograph the beat, steered by the fix + learned memory.
      const beat = beats.find((b) => b.idx === iss.beatIdx);
      if (!beat) continue;
      const note = [iss.fix, hint].filter(Boolean).join(". ");
      const steered = { ...beat, text: `${beat.text} (${note})` };
      const choreo = await choreographStickScenes({
        title: video.title,
        niche: project.niche,
        topic: video.topic,
        tone: project.tone,
        format: video.format,
        beats: [steered],
      });
      const next = choreo.scenes[0];
      if (next) {
        await patchClip(db, clip, lockCast(next, project));
        costUsd += choreo.costUsd;
        changes.push(`Re-choreographed beat ${iss.beatIdx! + 1}: ${iss.fix}`);
      }
    }
  }

  // Nothing matched a known category → re-roll the weakest-looking beat 0.
  if (changes.length === 0 && clips.length > 0) {
    const clip = byIdx.get(0) ?? clips[0];
    const beat = beats.find((b) => b.idx === clip.beat_index);
    if (beat) {
      const note = ["Make the action unmistakable and well-composed for 9:16", hint].filter(Boolean).join(". ");
      const choreo = await choreographStickScenes({
        title: video.title,
        niche: project.niche,
        topic: video.topic,
        tone: project.tone,
        format: video.format,
        beats: [{ ...beat, text: `${beat.text} (${note})` }],
      });
      if (choreo.scenes[0]) {
        await patchClip(db, clip, lockCast(choreo.scenes[0], project));
        costUsd += choreo.costUsd;
        changes.push(`Re-choreographed beat ${clip.beat_index + 1} for clarity`);
      }
    }
  }

  if (costUsd > 0) await recordCost(db, video, `autofix:${tier}`, costUsd, "Auto-fix re-choreography");
  return { changes, costUsd, tier };
}

// ── Loop B: AI image / clip fixers ────────────────────────────────────

const CAPTION_RE = /\b(caption|subtitle|text|legib|readab|on-?screen)\b/i;
const FRAME_RE = /\b(fram|crop|compos|cut off|off-?cent|zoom|too close|too wide|balance)\b/i;
const SCRIPT_RE = /\b(script|narrat|hook|pacing|story|confus|unclear|vo |voice ?over)\b/i;

async function planFootage(
  db: Db,
  video: Video,
  project: Project,
  critique: FrameCritique,
  mem: AutofixMemory,
): Promise<{ changes: string[]; costUsd: number; tier: "tier1" | "tier2" }> {
  const beats = await loadBeats(db, video.id);
  const clips = await loadClips(db, video.id);
  const changes: string[] = [];
  let costUsd = 0;
  const hint = memoryHint(mem);
  const tier: "tier1" | "tier2" = isTwelveLabsLive() && wantsTemporalPass(critique) ? "tier2" : "tier1";

  const issues = [...(critique.issues ?? [])].sort(
    (a, b) => (SEV_WEIGHT[b.severity] ?? 0) - (SEV_WEIGHT[a.severity] ?? 0),
  );
  let captionsDone = false;

  for (const iss of issues) {
    if (changes.length >= 2) break;
    const text = `${iss.note} ${iss.fix}`;

    if (CAPTION_RE.test(text) && !captionsDone) {
      if (!video.enable_captions) {
        await db.from("videos").update({ enable_captions: true }).eq("id", video.id);
        changes.push("Enabled word-window captions for legibility");
      } else {
        changes.push("Captions already on — flagged for manual caption styling");
      }
      captionsDone = true;
      continue;
    }

    // Re-roll / reframe a specific beat's visual. When the model named a beat
    // use it; otherwise target the first beat with a generated clip.
    const beat = iss.beatIdx != null ? beats.find((b) => b.idx === iss.beatIdx) : beats[0];
    if (!beat) continue;
    const target = clips.find((c) => c.beat_index === beat.idx);

    if (FRAME_RE.test(text) && target) {
      // Cheap, no regeneration: a reframe hint the render layout honours.
      await db
        .from("assets")
        .update({ meta: { ...target.meta, autofixReframe: { focus: "center", kenBurns: "gentle-zoom" } } })
        .eq("id", target.id);
      changes.push(`Reframed beat ${beat.idx + 1} (centre, gentle push-in)`);
      continue;
    }

    // Re-roll the visual (image/clip/stock) for the beat, steered by the fix +
    // memory + (when the root cause is the script) a sharper visual direction.
    const direction = [iss.fix, SCRIPT_RE.test(text) ? "tighten the visual storytelling for this beat" : "", hint]
      .filter(Boolean)
      .join(". ");
    const steered = { ...beat, visualPrompt: `${beat.visualPrompt}. ${direction}`.slice(0, 600) };
    const draft = await makeBeatClip(video, project, steered);
    await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", beat.idx);
    await db.from("assets").insert(draft.row);
    costUsd += draft.cost.usd;
    changes.push(`Re-rolled visual for beat ${beat.idx + 1}: ${iss.fix}`);
  }

  if (costUsd > 0) await recordCost(db, video, `autofix:${tier}`, costUsd, "Auto-fix visual re-roll");
  return { changes, costUsd, tier };
}

// ── Re-render trigger ─────────────────────────────────────────────────
// Both loops have already rendered once and edit existing assets in place, so a
// plain return to ASSEMBLING re-renders from the updated assets. The render farm
// (Tier-1 vision included) produces a fresh critique the next pass reads.

async function triggerRerender(db: Db, videoId: string) {
  await db.from("videos").update({ status: "ASSEMBLING", paused_reason: null }).eq("id", videoId);
}

// ── The per-video state machine ───────────────────────────────────────

export type AutofixOutcome =
  | { acted: false; reason: string }
  | { acted: true; kind: "fixed" | "done" | "held"; score: number; changes?: string[] };

/** Drive one video one step through the loop. Idempotent and bounded:
    critique → (below threshold) fix + re-render → re-critique next pass, up to
    maxRenders, then hold for manual review. */
export async function processAutofixForVideo(
  db: Db,
  video: Video,
  project: Project,
): Promise<AutofixOutcome> {
  const { on, loop, config } = resolveAutofix(project, video);
  if (!on) return { acted: false, reason: "disabled" };
  if (video.status !== "FINAL_REVIEW") return { acted: false, reason: "not-at-final-review" };

  const state: AutofixState = { ...(video.autofix_state ?? {}) };
  if (state.status === "done" || state.status === "held") return { acted: false, reason: state.status };

  const critique = await getCritique(db, video, project, loop);
  if (!critique) return { acted: false, reason: "awaiting-critique" };

  // For animation we wait on the farm to publish a NEW vision_review after a
  // re-render; same timestamp as last time means it hasn't re-critiqued yet.
  if (state.status === "rerendering" && critique.at === state.actedOnAt) {
    return { acted: false, reason: "awaiting-rerender" };
  }

  const score = Number(critique.score ?? 0);
  const attempts = Number(state.attempts ?? 0);
  let mem = (project.autofix_memory ?? {}) as AutofixMemory;

  // Close out the previous attempt's bookkeeping now that a fresh score landed.
  const open = (state.history ?? []).slice(-1)[0];
  if (open && open.toScore == null && attempts > 0) {
    const delta = Math.round((score - open.fromScore) * 100) / 100;
    open.toScore = score;
    mem = foldMemory(mem, open.changes, delta);
    await saveMemory(db, project.id, mem);
    await db
      .from("autofix_runs")
      .update({ to_score: score, status: delta >= 0.3 ? "improved" : delta <= -0.3 ? "regressed" : "applied" })
      .eq("video_id", video.id)
      .is("to_score", null);
  }

  state.lastScore = score;
  state.bestScore = Math.max(Number(state.bestScore ?? 0), score);
  state.loop = loop;

  // Converged — leave the video at Final Review for normal flow.
  if (score >= config.threshold) {
    state.status = "done";
    await setState(db, video.id, state);
    return { acted: true, kind: "done", score };
  }

  // Out of attempts or budget — hold for a human.
  const spent = Number(state.spentUsd ?? 0);
  if (attempts >= config.maxRenders || spent >= config.spendCapUsd) {
    state.status = "held";
    await setState(db, video.id, state);
    const why =
      attempts >= config.maxRenders
        ? `${score.toFixed(1)}/10 after ${attempts} re-render${attempts === 1 ? "" : "s"}`
        : `spend cap $${config.spendCapUsd.toFixed(2)} reached`;
    await db
      .from("videos")
      .update({ paused_reason: `Auto-fix held — ${why}. Manual review.` })
      .eq("id", video.id);
    await db.from("autofix_runs").insert({
      project_id: project.id,
      video_id: video.id,
      loop,
      attempt: attempts + 1,
      tier: "tier1",
      from_score: score,
      changes: [],
      status: "held",
      note: why,
    });
    return { acted: true, kind: "held", score };
  }

  // Apply one fix bundle and re-render.
  const plan = loop === "animation"
    ? await planAnimation(db, video, project, critique, mem)
    : await planFootage(db, video, project, critique, mem);

  if (plan.changes.length === 0) {
    state.status = "held";
    await setState(db, video.id, state);
    await db
      .from("videos")
      .update({ paused_reason: `Auto-fix held — no actionable fix at ${score.toFixed(1)}/10. Manual review.` })
      .eq("id", video.id);
    return { acted: true, kind: "held", score };
  }

  const attempt = attempts + 1;
  state.attempts = attempt;
  state.spentUsd = spent + plan.costUsd;
  state.actedOnAt = critique.at;
  state.status = "rerendering";
  state.history = [...(state.history ?? []), { attempt, fromScore: score, changes: plan.changes, at: new Date().toISOString() }];
  await setState(db, video.id, state);

  await db.from("autofix_runs").insert({
    project_id: project.id,
    video_id: video.id,
    loop,
    attempt,
    tier: plan.tier,
    from_score: score,
    changes: plan.changes,
    cost_usd: plan.costUsd,
    status: "applied",
  });

  await triggerRerender(db, video.id);
  return { acted: true, kind: "fixed", score, changes: plan.changes };
}

// ── Sweep entry (cron / build-runner) ─────────────────────────────────

/** True when a video should be left alone by the auto-pilot finalizer because
    the loop is still working it (so it doesn't publish a pre-fix cut). */
export function autofixInFlight(video: Pick<Video, "autofix_state">): boolean {
  const s = (video.autofix_state ?? {}) as AutofixState;
  return s.status === "rerendering";
}

/**
 * Scan FINAL_REVIEW videos whose channel has the loop enabled and advance each
 * one step. Bounded per pass; safe to call every few minutes.
 */
export async function sweepAutofix(
  limit = 8,
  dbArg?: Db,
): Promise<{ scanned: number; fixed: number; done: number; held: number }> {
  const db = dbArg ?? createAdminClient();
  const { data: rows } = await db
    .from("videos")
    .select("*")
    .eq("status", "FINAL_REVIEW")
    .order("updated_at", { ascending: true })
    .limit(limit + 20);

  const videos = ((rows ?? []) as Video[]).filter((v) => {
    const s = (v.autofix_state ?? {}) as AutofixState;
    return s.status !== "done" && s.status !== "held";
  });

  let scanned = 0;
  let fixed = 0;
  let done = 0;
  let held = 0;
  const projects = new Map<string, Project | null>();

  for (const video of videos) {
    if (scanned >= limit) break;
    if (!projects.has(video.project_id)) {
      const { data } = await db.from("projects").select("*").eq("id", video.project_id).maybeSingle();
      projects.set(video.project_id, (data as Project) ?? null);
    }
    const project = projects.get(video.project_id);
    if (!project) continue;
    if (!resolveAutofix(project, video).on) continue;
    scanned += 1;
    try {
      const out = await processAutofixForVideo(db, video, project);
      if (out.acted && out.kind === "fixed") fixed += 1;
      else if (out.acted && out.kind === "done") done += 1;
      else if (out.acted && out.kind === "held") held += 1;
    } catch (err) {
      console.error(`autofix ${video.id} failed:`, err);
    }
  }
  return { scanned, fixed, done, held };
}
