"use server";

/**
 * Workspace server actions (ClickMax transition Phase 2). The thin HTTP edge
 * of the new UX: the composer (chat OR buttons) calls these; they route
 * through the intent router + action registry, persist the thread to
 * `workspace_messages`, and enforce the confirm-with-USD-estimate rule for
 * cost-bearing actions (§3.1).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GATE_FOR_STATUS } from "@studio/core";
import {
  executeWorkspaceAction,
  getWorkspaceAction,
} from "@/lib/workspace/registry";
import { routeIntent, type ComposerMode, type RouteContext } from "@/lib/workspace/router";
import type { Video } from "@/lib/db/types";

export type ComposerResult = {
  ok: boolean;
  error?: string;
  /** Agent reply text to append to the thread. */
  reply?: string;
  /** Cost-bearing action awaiting the user's confirm (estimate attached). */
  pending?: { action: string; params: Record<string, unknown>; label: string; estimateUsd: number };
  /** Read-action payload (spend/QC summaries) for rich rendering. */
  data?: unknown;
};

/** Confirm threshold: below this the action just runs (a re-roll costs cents —
    nagging on every one defeats the loop). Project-tunable via composer_prefs. */
const DEFAULT_CONFIRM_USD = 0.5;

function refresh(projectId: string, videoId: string) {
  revalidatePath(`/projects/${projectId}/videos/${videoId}`);
  revalidatePath(`/projects/${projectId}`);
}

async function saveMessage(
  db: Awaited<ReturnType<typeof createClient>>,
  row: {
    project_id: string;
    video_id: string;
    role: "user" | "agent";
    content: string;
    intent?: unknown;
  },
): Promise<void> {
  try {
    await db.from("workspace_messages").insert(row);
  } catch (err) {
    console.error("workspace message save failed (non-blocking):", err);
  }
}

function summarize(data: unknown): string {
  if (data == null) return "Done.";
  const d = data as {
    totalUsd?: number;
    byProvider?: Record<string, number>;
    reviews?: { gate: string; score: number | null; verdict: string | null; issues?: string[] }[];
  };
  if (d.totalUsd != null) {
    const providers = Object.entries(d.byProvider ?? {})
      .map(([p, usd]) => `${p} $${usd.toFixed(2)}`)
      .join(", ");
    return `This video has cost $${d.totalUsd.toFixed(2)} so far${providers ? ` (${providers})` : ""}.`;
  }
  const fix = data as { kind?: string; score?: number; changes?: string[] };
  if (fix.changes) {
    return `Auto-fix ran (${fix.kind ?? "repair"}${fix.score != null ? `, QC ${fix.score.toFixed(1)}` : ""}): ${fix.changes.slice(0, 3).join("; ") || "no changes needed"}.`;
  }
  if (d.reviews) {
    if (d.reviews.length === 0) return "No QC reviews yet for this video.";
    const latest = d.reviews[0];
    const issues = (latest.issues ?? []).slice(0, 3).join("; ");
    return `Latest QC (${latest.gate}): ${latest.score != null ? `${Number(latest.score).toFixed(1)}/10` : "no score"}${latest.verdict ? `, ${latest.verdict}` : ""}${issues ? `. Flagged: ${issues}` : "."}`;
  }
  return "Done.";
}

export async function sendComposerMessage(opts: {
  projectId: string;
  videoId: string;
  text: string;
  mode: ComposerMode;
  focused?: RouteContext["focused"];
  modelId?: string;
  durationSec?: number;
}): Promise<ComposerResult> {
  try {
    const db = await createClient();
    const { data: video } = await db
      .from("videos")
      .select("*")
      .eq("id", opts.videoId)
      .maybeSingle();
    if (!video) return { ok: false, error: "Video not found" };
    const v = video as Video;

    const { data: project } = await db
      .from("projects")
      .select("composer_prefs")
      .eq("id", opts.projectId)
      .maybeSingle();
    const prefs = (project?.composer_prefs ?? {}) as { confirmUsd?: number };
    const confirmUsd = Number(prefs.confirmUsd ?? DEFAULT_CONFIRM_USD);

    await saveMessage(db, {
      project_id: opts.projectId,
      video_id: opts.videoId,
      role: "user",
      content: opts.text,
    });

    const ctx: RouteContext = {
      videoId: opts.videoId,
      projectId: opts.projectId,
      status: v.status,
      atGate: Boolean(GATE_FOR_STATUS[v.status]),
      mode: opts.mode,
      focused: opts.focused ?? null,
      modelId: opts.modelId,
      durationSec: opts.durationSec,
      targetLengthSec: v.target_length_sec ?? 300,
    };
    const intent = await routeIntent(opts.text, ctx);

    if (intent.kind === "reply") {
      await saveMessage(db, {
        project_id: opts.projectId,
        video_id: opts.videoId,
        role: "agent",
        content: intent.text,
      });
      return { ok: true, reply: intent.text };
    }

    const action = getWorkspaceAction(intent.action);
    if (!action) return { ok: false, error: `Unknown action ${intent.action}` };

    // Confirm rule: cost-bearing + at/above threshold → hold for one tap.
    const estimate = action.estimate(intent.params);
    if (action.costBearing && estimate != null && estimate >= confirmUsd) {
      const reply = `${intent.label} — estimated ~$${estimate.toFixed(2)}. Confirm?`;
      await saveMessage(db, {
        project_id: opts.projectId,
        video_id: opts.videoId,
        role: "agent",
        content: reply,
        intent: { action: intent.action, params: intent.params, pending: true },
      });
      return {
        ok: true,
        reply,
        pending: { action: intent.action, params: intent.params, label: intent.label, estimateUsd: estimate },
      };
    }

    const result = await executeWorkspaceAction(intent.action, intent.params, db);
    const reply = result.ok
      ? result.data != null
        ? summarize(result.data)
        : `${intent.label} — done.`
      : `${intent.label} — failed: ${result.error}`;
    await saveMessage(db, {
      project_id: opts.projectId,
      video_id: opts.videoId,
      role: "agent",
      content: reply,
      intent: { action: intent.action, params: intent.params, ok: result.ok },
    });
    refresh(opts.projectId, opts.videoId);
    return { ok: result.ok, error: result.error, reply, data: result.data };
  } catch (err) {
    console.error("composer message failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Second tap of the confirm rule: run a previously estimated pending action. */
export async function confirmComposerAction(opts: {
  projectId: string;
  videoId: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<ComposerResult> {
  try {
    const db = await createClient();
    const result = await executeWorkspaceAction(opts.action, opts.params, db);
    const reply = result.ok
      ? result.data != null
        ? summarize(result.data)
        : "Done."
      : `Failed: ${result.error}`;
    await saveMessage(db, {
      project_id: opts.projectId,
      video_id: opts.videoId,
      role: "agent",
      content: reply,
      intent: { action: opts.action, params: opts.params, ok: result.ok, confirmed: true },
    });
    refresh(opts.projectId, opts.videoId);
    return { ok: result.ok, error: result.error, reply, data: result.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** The Continue button — same action the router's "continue" resolves to. */
export async function continueStageAction(opts: {
  projectId: string;
  videoId: string;
}): Promise<ComposerResult> {
  try {
    const db = await createClient();
    const { data: video } = await db
      .from("videos")
      .select("status, target_length_sec")
      .eq("id", opts.videoId)
      .maybeSingle();
    if (!video) return { ok: false, error: "Video not found" };
    const atGate = Boolean(GATE_FOR_STATUS[(video as Video).status]);
    const result = await executeWorkspaceAction(
      "continue",
      {
        videoId: opts.videoId,
        atGate,
        status: (video as Video).status,
        targetLengthSec: (video as Video).target_length_sec ?? 300,
      },
      db,
    );
    refresh(opts.projectId, opts.videoId);
    return { ok: result.ok, error: result.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The single mode switch (decision on plan §4.2). Made REAL against existing
 * engine semantics: director sets pipeline_mode='director' (engine never
 * self-advances); autopilot sets pipeline_mode='autonomous' with every gate
 * at 'autopilot' so arrivals auto-advance.
 */
export async function setWorkspaceModeAction(opts: {
  projectId: string;
  mode: "director" | "autopilot";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    const patch =
      opts.mode === "director"
        ? { workspace_mode: "director", pipeline_mode: "director" }
        : {
            workspace_mode: "autopilot",
            pipeline_mode: "autonomous",
            autonomy: { IDEA: "autopilot", SCRIPT: "autopilot", ASSETS: "autopilot", FINAL: "autopilot" },
          };
    const { error } = await db.from("projects").update(patch).eq("id", opts.projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${opts.projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Notification channel toggles (decision 6) — honored at gate arrivals. */
export async function saveNotifyPrefsAction(opts: {
  projectId: string;
  prefs: { telegram: boolean; webpush: boolean };
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    const { error } = await db
      .from("projects")
      .update({ notify_prefs: opts.prefs })
      .eq("id", opts.projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${opts.projectId}/settings`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Project instructions — injected into every prompt path (§4.6). */
export async function saveInstructionsAction(opts: {
  projectId: string;
  instructions: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await createClient();
    const { error } = await db
      .from("projects")
      .update({ instructions: opts.instructions.slice(0, 4000) || null })
      .eq("id", opts.projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${opts.projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
