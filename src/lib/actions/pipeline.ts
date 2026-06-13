"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  decideGate,
  editScriptBeat,
  editVideoMetadata,
  rerollBeatVisual,
  runPipeline,
} from "@/lib/pipeline/engine";
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
    const result = await decideGate({ videoId, decision: "killed" });
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
): Promise<PipelineResult> {
  const clean = topic.trim();
  if (!clean) return { ok: false, error: "Type a topic first." };
  return guarded(async () => {
    const supabase = await createClient();
    const title = clean
      .replace(/\s+/g, " ")
      .replace(/^./, (c) => c.toUpperCase());
    const { data: video, error } = await supabase
      .from("videos")
      .insert({ project_id: projectId, title, topic: clean, status: "IDEA" })
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

export async function setKillSwitchAction(enabled: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("app_settings")
    .upsert({ key: "kill_switch", value: { enabled } });
  revalidatePath("/settings");
  revalidatePath("/");
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
