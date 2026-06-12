"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decideGate, runPipeline } from "@/lib/pipeline/engine";
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
