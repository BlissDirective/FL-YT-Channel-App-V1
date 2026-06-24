"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runIntelligence } from "@/lib/pipeline/intelligence";
import { runOptimizer, runOptimizerAllProjects } from "@/lib/pipeline/optimizer";
import { scoutChat, type ScoutMessage } from "@/lib/adapters/scout";

export type Result = { ok: boolean; error?: string };

/** "Generate ideas" — scout + score a fresh batch of idea cards into the queue
    at the Idea gate (approve/reject there). Length sets the videos' target
    runtime: short ≈ 45s, long/either ≈ 8 min (either defaults to long). */
export async function runIntelligenceNowAction(
  projectId: string,
  length: "short" | "long" | "either" = "either",
): Promise<Result> {
  try {
    const targetLengthSec = length === "short" ? 45 : 480;
    const { created } = await runIntelligence(projectId, { targetLengthSec });
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/review`);
    return created > 0
      ? { ok: true }
      : { ok: false, error: "No new ideas this run — try again later or widen the niche." };
  } catch (err) {
    console.error("runIntelligenceNow failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** "Run optimizer now" — generate insight cards from tracked stats. */
export async function runOptimizerNowAction(projectId: string): Promise<Result> {
  try {
    const { created } = await runOptimizer(projectId);
    revalidatePath("/insights");
    revalidatePath(`/projects/${projectId}`);
    return created > 0
      ? { ok: true }
      : { ok: false, error: "Not enough tracked videos yet for new insights (need 2+)." };
  } catch (err) {
    console.error("runOptimizerNow failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** "Generate insights" on /insights — run the Optimizer across all projects. */
export async function runAllOptimizerAction(): Promise<Result> {
  try {
    const { created } = await runOptimizerAllProjects();
    revalidatePath("/insights");
    return created > 0
      ? { ok: true }
      : { ok: false, error: "No new insights — need 2+ tracked videos in a project." };
  } catch (err) {
    console.error("runAllOptimizer failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function scoutChatAction(
  projectId: string,
  messages: ScoutMessage[],
): Promise<Result & { reply?: string }> {
  try {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("niche, audience, angle")
      .eq("id", projectId)
      .maybeSingle();
    const { reply, costUsd } = await scoutChat({
      niche: project?.niche ?? "",
      audience: project?.audience ?? "",
      angle: project?.angle ?? "",
      messages: messages.slice(-12),
    });
    if (costUsd > 0) {
      await supabase.from("cost_ledger").insert({
        project_id: projectId,
        provider: "anthropic",
        description: "Scout research chat",
        usd: costUsd,
      });
    }
    return { ok: true, reply };
  } catch (err) {
    console.error("scoutChat failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Save a Scout finding as an idea card that lands in the review queue. */
export async function saveScoutIdeaAction(
  projectId: string,
  title: string,
  angle: string,
): Promise<Result> {
  const t = title.trim();
  if (!t) return { ok: false, error: "Give the idea a title." };
  try {
    const supabase = await createClient();
    const { data: idea, error: ideaErr } = await supabase
      .from("ideas")
      .insert({
        project_id: projectId,
        title: t,
        angle: angle.trim(),
        status: "new",
        flag: "MEDIUM",
        source: { origin: "scout" },
      })
      .select("id")
      .single();
    // Don't claim success if the idea didn't actually save (and don't insert a
    // video orphaned from a missing idea).
    if (ideaErr || !idea) {
      return { ok: false, error: ideaErr?.message ?? "Could not save the idea." };
    }
    const { error: videoErr } = await supabase.from("videos").insert({
      project_id: projectId,
      idea_id: idea.id,
      title: t,
      topic: t,
      status: "IDEA",
    });
    if (videoErr) return { ok: false, error: videoErr.message };
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/review`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Apply an Optimizer insight's proposed template diff: save it as a new active
 * template version (revertible via versioning) and mark the insight applied.
 */
export async function applyInsightAction(insightId: string): Promise<Result> {
  try {
    const supabase = await createClient();
    const { data: insight } = await supabase
      .from("insights")
      .select("*")
      .eq("id", insightId)
      .maybeSingle();
    if (!insight) return { ok: false, error: "Insight not found." };
    if (!insight.proposed_template_kind || !insight.proposed_template_body) {
      // Insight with no template change — applying just acknowledges it.
      await supabase.from("insights").update({ status: "applied" }).eq("id", insightId);
      revalidatePath("/insights");
      return { ok: true };
    }

    const { data: latest } = await supabase
      .from("prompt_templates")
      .select("version")
      .eq("project_id", insight.project_id)
      .eq("kind", insight.proposed_template_kind)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (latest?.version ?? 0) + 1;

    await supabase
      .from("prompt_templates")
      .update({ active: false })
      .eq("project_id", insight.project_id)
      .eq("kind", insight.proposed_template_kind);
    const { error } = await supabase.from("prompt_templates").insert({
      project_id: insight.project_id,
      kind: insight.proposed_template_kind,
      version,
      body: insight.proposed_template_body,
      active: true,
    });
    if (error) return { ok: false, error: error.message };

    await supabase
      .from("insights")
      .update({ status: "applied", applied_template_version: version })
      .eq("id", insightId);
    revalidatePath("/insights");
    revalidatePath(`/projects/${insight.project_id}/settings`);
    return { ok: true };
  } catch (err) {
    console.error("applyInsight failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function dismissInsightAction(insightId: string): Promise<Result> {
  try {
    const supabase = await createClient();
    await supabase.from("insights").update({ status: "dismissed" }).eq("id", insightId);
    revalidatePath("/insights");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
