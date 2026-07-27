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
  const mine = data as { mined?: number; skipped?: number; costUsd?: number };
  if (mine.mined != null) {
    return `Mined ${mine.mined} winner exemplar${mine.mined === 1 ? "" : "s"} from the niche${mine.skipped ? ` (${mine.skipped} skipped)` : ""}${mine.costUsd ? ` · ~$${mine.costUsd.toFixed(2)}` : ""}. Every new script now studies them.`;
  }
  const perf = data as {
    tracked?: number;
    qcViewsCorrelation?: number | null;
    promotedOwnWinners?: number;
    exemplars?: { total: number; own: number };
  };
  if (perf.tracked != null) {
    const corr =
      perf.qcViewsCorrelation != null
        ? `QC↔views correlation ${perf.qcViewsCorrelation} (${Math.abs(perf.qcViewsCorrelation) < 0.3 ? "weak — trust your own grades" : perf.qcViewsCorrelation >= 0.3 ? "QC is somewhat predictive here" : "inverted — QC is misleading on this channel"})`
        : "not enough scored+tracked videos yet to test whether QC predicts views";
    const ex = perf.exemplars
      ? ` Exemplar library: ${perf.exemplars.total} (${perf.exemplars.own} of your own winners).`
      : "";
    return `${perf.tracked} video${perf.tracked === 1 ? "" : "s"} tracking. ${corr}.${perf.promotedOwnWinners ? ` Promoted ${perf.promotedOwnWinners} of your own winners into the exemplar library.` : ""}${ex}`;
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
 * Project-level open composer. Instead of the create door only seeding an
 * "idea", this takes any pasted brief or command, births a video, and routes
 * the SAME text through the workspace intent router — so "write a song about
 * tidying up, led by the whole cast" creates the video AND writes the song in
 * one shot, and a plain topic simply lands a fresh idea to continue from. The
 * whole system is reachable from the first prompt, not just the idea phase.
 *
 * Returns the new videoId so the client can drop the operator straight into
 * that video's workspace, where the same conversation continues.
 */
export async function startFromPromptAction(opts: {
  projectId: string;
  text: string;
  /** Per-video song/voice model. Omit or "default" = the channel's preferred
      model (falls back to the built-in default). */
  songModelId?: string;
}): Promise<ComposerResult & { videoId?: string }> {
  try {
    const text = opts.text.trim();
    if (!text) return { ok: false, error: "Type something to start." };
    const db = await createClient();
    const songModel =
      opts.songModelId && opts.songModelId !== "default" ? opts.songModelId : null;

    // Title = first meaningful line (stripped of quotes/brackets); the full
    // brief becomes the topic so downstream generators see all the context.
    const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? text;
    const title =
      firstLine.replace(/^[[\]"'“”\s]+|[[\]"'“”\s]+$/g, "").slice(0, 90) || "New video";
    // Duration hint anywhere in the brief: "90s", "2 min", "150 seconds".
    const secMatch = /(\d{1,4})\s*s(ec(onds?)?)?\b/i.exec(text);
    const minMatch = /(\d{1,3})\s*min/i.exec(text);
    const target = minMatch
      ? Number(minMatch[1]) * 60
      : secMatch
        ? Number(secMatch[1])
        : undefined;
    const kind = /\bshort\b|9:16|vertical/i.test(text) ? "short" : "long";

    const { data: video, error } = await db
      .from("videos")
      .insert({
        project_id: opts.projectId,
        title,
        topic: text,
        status: "IDEA",
        kind,
        ...(target ? { target_length_sec: Math.max(15, Math.min(target, 1200)) } : {}),
        ...(songModel ? { song_model: songModel } : {}),
      })
      .select("*")
      .single();
    if (error || !video) {
      return { ok: false, error: error?.message ?? "Could not start the video." };
    }
    const v = video as Video;

    await saveMessage(db, {
      project_id: opts.projectId,
      video_id: v.id,
      role: "user",
      content: text,
    });

    const ctx: RouteContext = {
      videoId: v.id,
      projectId: opts.projectId,
      status: v.status,
      atGate: Boolean(GATE_FOR_STATUS[v.status]),
      mode: "idea",
      focused: null,
      targetLengthSec: v.target_length_sec ?? 300,
    };
    const intent = await routeIntent(text, ctx);

    let reply: string;
    let ok = true;
    if (intent.kind === "reply") {
      reply = `Created “${title}”. ${intent.text}`;
    } else {
      const action = getWorkspaceAction(intent.action);
      if (!action) {
        reply = `Created “${title}”. Open it to keep going.`;
      } else {
        // A deliberate model pick from the composer wins over the router's
        // keyword guess for song actions.
        const params =
          songModel && (intent.action === "write_song" || intent.action === "resing_song")
            ? { ...intent.params, modelId: songModel }
            : intent.params;
        const result = await executeWorkspaceAction(intent.action, params, db);
        ok = result.ok;
        reply = result.ok
          ? result.data != null
            ? summarize(result.data)
            : `${intent.label} — done.`
          : `${intent.label} — failed: ${result.error}`;
      }
    }

    await saveMessage(db, {
      project_id: opts.projectId,
      video_id: v.id,
      role: "agent",
      content: reply,
      intent: { kind: intent.kind, ...(intent.kind === "action" ? { action: intent.action } : {}) },
    });
    revalidatePath(`/projects/${opts.projectId}`);
    revalidatePath(`/projects/${opts.projectId}/library`);
    revalidatePath(`/projects/${opts.projectId}/videos/${v.id}`);
    return { ok, reply, videoId: v.id };
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

/**
 * AI Avatar: upload/replace the project's presenter image — the ONE fixed
 * image that drives every avatar shot (identity by construction).
 */
export async function savePresenterImageAction(
  projectId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const file = formData.get("presenter");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Image too large (max 10 MB)." };
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return { ok: false, error: "Use a PNG, JPG, or WEBP image." };
    }
    const { uploadMedia } = await import("@/lib/storage");
    const path = `presenters/${projectId}/presenter-${Date.now().toString(36)}.${ext}`;
    await uploadMedia(path, Buffer.from(await file.arrayBuffer()), file.type || "image/png");
    const db = await createClient();
    const { error } = await db
      .from("projects")
      .update({ presenter_image_path: path })
      .eq("id", projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/settings`);
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

/**
 * Character Studio Phase 3: set exactly who is in one beat's frame.
 *
 * The chips post the FULL desired set as add/remove relative to what the
 * matcher found on its own, so the correction stays meaningful when the beat's
 * text is later edited and the matcher's baseline moves.
 */
export async function setBeatCastAction(opts: {
  projectId: string;
  videoId: string;
  beatIdx: number;
  add: string[];
  remove: string[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { setBeatCast } = await import("@/lib/pipeline/engine");
    const r = await setBeatCast({
      videoId: opts.videoId,
      beatIdx: opts.beatIdx,
      add: opts.add,
      remove: opts.remove,
    });
    if (!r.ok) return { ok: false, error: r.error };
    refresh(opts.projectId, opts.videoId);
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
