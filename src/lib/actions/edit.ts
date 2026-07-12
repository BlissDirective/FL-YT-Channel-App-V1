"use server";

import { revalidatePath } from "next/cache";
import { GATE_FOR_STATUS, validateEdd, type EddDb, type EditDocument, type VideoStatus } from "@studio/core";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildEddContext,
  cutBeatsToSegment,
  insertEddVersion,
  requestEddPreview,
} from "@/lib/pipeline/edd-service";
import { decideGate } from "@/lib/pipeline/engine";
import { checkBudget, recordCost } from "@/lib/pipeline/ledger";
import { dispatchWorkflow } from "@/lib/adapters/gh-dispatch";
import { generateSoundEffect, isSfxLive } from "@/lib/adapters/sfx";
import { uploadMedia } from "@/lib/storage";
import { normalizeTarget } from "@/lib/edd-editor";
import { createHash } from "node:crypto";
import type { ScriptBeat, ShortSegment } from "@/lib/db/types";

/**
 * /edit server actions (MVDA Phase B, plan §5). The document is the single
 * source of truth for the cut: a human save is just a new version row
 * (author='human'), validated by the SAME validateEdd the compiler and the
 * future agent go through, with optimistic concurrency on the head enforced
 * INSIDE the version allocator (A9 — no check-then-act window).
 */

export type EditActionResult = { ok: boolean; error?: string; version?: number };

function refresh(projectId: string, videoId: string) {
  revalidatePath(`/projects/${projectId}/videos/${videoId}`);
  revalidatePath(`/projects/${projectId}/videos/${videoId}/edit`);
}

/** Server-action exceptions reach clients as opaque digests in production;
    convert them to readable inline errors (same contract as actions/pipeline). */
async function guarded<T extends EditActionResult>(fn: () => Promise<T>): Promise<T | EditActionResult> {
  try {
    return await fn();
  } catch (err) {
    console.error("edit action failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Load the pieces a save needs to validate against (same sourceId rules as
    the compiler: derived shorts validate against the parent's assets). */
async function loadValidationInputs(videoId: string) {
  const db = createAdminClient();
  const { data: video } = await db
    .from("videos")
    .select("id, project_id, status, kind, parent_video_id, source_segment")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return null;
  const isDerived = video.kind === "short" && video.parent_video_id;
  const sourceId: string = isDerived ? video.parent_video_id : videoId;
  const [{ data: script }, { data: assets }] = await Promise.all([
    db
      .from("scripts")
      .select("id, beats")
      .eq("video_id", sourceId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("assets").select("id, kind, meta").eq("video_id", sourceId),
  ]);
  if (!script || !assets) return null;
  let beats = script.beats as ScriptBeat[];
  if (isDerived) beats = cutBeatsToSegment(beats, (video.source_segment ?? null) as ShortSegment | null);
  return { db, video, scriptId: script.id as string, beats, assets };
}

/** Statuses where the video has not rendered yet — activating a new cut
    before these needs no verdict invalidation. */
const PRE_RENDER: VideoStatus[] = [
  "IDEA",
  "IDEA_APPROVED",
  "SCRIPTING",
  "SCRIPT_READY",
  "NEEDS_REVISION",
  "GENERATING_ASSETS",
  "ASSETS_READY",
  "ASSEMBLING",
];

/**
 * Point the render path at a version. Past the render, activating a new cut
 * ALSO clears the stored Self-Watch/vision verdicts — the drift class the
 * settle invariants exist to prevent (plan §6 conflict #7): a re-render must
 * be re-judged, never published on judgments of the previous cut.
 */
async function activateVersion(
  db: ReturnType<typeof createAdminClient>,
  videoId: string,
  version: number,
  status: VideoStatus,
): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = { edit_document_version: version };
  if (!PRE_RENDER.includes(status)) {
    patch.watch_review = null;
    patch.vision_review = null;
  }
  const { error } = await db.from("videos").update(patch).eq("id", videoId);
  return error ? { ok: false, error: `activation failed: ${error.message}` } : { ok: true };
}

/**
 * Save the operator's cut as a new version and make it the active render
 * document. Rejected when the head moved since the editor loaded (A9) or
 * when the document fails validation.
 */
export async function saveEddAction(
  projectId: string,
  videoId: string,
  rawDoc: EditDocument,
  parentVersion: number,
  note: string,
): Promise<EditActionResult> {
  return guarded(async () => {
    const inputs = await loadValidationInputs(videoId);
    if (!inputs) return { ok: false, error: "video, script, or assets missing" };
    const { db, video, scriptId, beats, assets } = inputs;

    // Human edits re-pin the target to the actual runtime (edd-editor).
    const doc = normalizeTarget(rawDoc);
    const verdict = validateEdd(doc, buildEddContext(assets, beats, doc.meta.targetDurationSec));
    if (!verdict.ok) {
      return {
        ok: false,
        error: `invalid document: ${verdict.errors
          .slice(0, 4)
          .map((e) => `${e.rule} — ${e.msg}`)
          .join("; ")}${verdict.errors.length > 4 ? ` (+${verdict.errors.length - 4} more)` : ""}`,
      };
    }

    const inserted = await insertEddVersion(db as unknown as EddDb, {
      videoId,
      scriptId,
      doc,
      author: "human",
      note: note.trim() || "Edited in /edit",
      parentVersion,
      requireParentHead: true, // A9 — enforced inside the allocator
    });
    if (!inserted.ok) return inserted;

    const activated = await activateVersion(db, videoId, inserted.version, video.status as VideoStatus);
    if (!activated.ok) return { ok: false, error: `saved v${inserted.version} but ${activated.error}` };

    refresh(projectId, videoId);
    return { ok: true, version: inserted.version };
  });
}

/** Revert = append a copy of an older version as the new head (append-only). */
export async function revertEddAction(
  projectId: string,
  videoId: string,
  toVersion: number,
): Promise<EditActionResult> {
  return guarded(async () => {
    const db = createAdminClient();
    const [{ data: row }, { data: video }, { data: head }] = await Promise.all([
      db.from("edit_documents").select("doc, script_id").eq("video_id", videoId).eq("version", toVersion).maybeSingle(),
      db.from("videos").select("status").eq("id", videoId).maybeSingle(),
      db
        .from("edit_documents")
        .select("version")
        .eq("video_id", videoId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!row || !video) return { ok: false, error: `v${toVersion} not found` };
    const inserted = await insertEddVersion(db as unknown as EddDb, {
      videoId,
      scriptId: row.script_id as string,
      doc: row.doc as EditDocument,
      author: "human",
      note: `Revert to v${toVersion}`,
      parentVersion: head?.version ?? null,
      requireParentHead: true,
    });
    if (!inserted.ok) return inserted;
    const activated = await activateVersion(db, videoId, inserted.version, video.status as VideoStatus);
    if (!activated.ok) return { ok: false, error: `reverted as v${inserted.version} but ${activated.error}` };
    refresh(projectId, videoId);
    return { ok: true, version: inserted.version };
  });
}

/** Queue a true-fidelity half-res preview render (whole video or a range)
    and kick the render workflow so it starts within minutes, not the cron. */
export async function requestPreviewAction(
  projectId: string,
  videoId: string,
  range?: { fromSec?: number; toSec?: number },
): Promise<EditActionResult> {
  return guarded(async () => {
    const result = await requestEddPreview(videoId, range ?? {});
    if (!result.ok) return { ok: false, error: result.error };
    await dispatchWorkflow("render.yml"); // best-effort; cron picks it up otherwise
    refresh(projectId, videoId);
    return { ok: true };
  });
}

/** Approve cut — the CUT-gate decision. Guarded to the ASSETS/CUT gate: a
    stale editor tab must never approve whatever gate the video happens to be
    at now (e.g. FINAL after autopilot moved it). The version is stamped
    'approved' only AFTER the gate actually resolves. */
export async function approveCutAction(projectId: string, videoId: string): Promise<EditActionResult> {
  return guarded(async () => {
    const db = createAdminClient();
    const { data: video } = await db
      .from("videos")
      .select("status, edit_document_version")
      .eq("id", videoId)
      .maybeSingle();
    if (video?.edit_document_version == null) {
      return { ok: false, error: "no active cut — save a version first" };
    }
    if (GATE_FOR_STATUS[video.status as VideoStatus] !== "ASSETS") {
      return {
        ok: false,
        error: `the video is no longer at the Cut gate (status: ${video.status}) — reload`,
      };
    }
    const result = await decideGate({ videoId, decision: "approved" });
    if (!result.ok) return { ok: false, error: result.error };
    await db
      .from("edit_documents")
      .update({ status: "approved" })
      .eq("video_id", videoId)
      .eq("version", video.edit_document_version);
    refresh(projectId, videoId);
    return { ok: true };
  });
}

/**
 * Generate a sound effect (Phase D, D7 generated source): ElevenLabs
 * sound-generation → `media` storage → asset row kind='sfx'. The cue itself
 * is placed client-side (addAudioCue) and lands with the next save — this
 * action only mints the referenced asset. Budget-gated + ledgered like every
 * other paid provider call.
 */
export async function generateSfxAction(
  projectId: string,
  videoId: string,
  prompt: string,
  durationSec?: number,
): Promise<EditActionResult & { assetId?: string }> {
  return guarded(async () => {
    if (!isSfxLive()) return { ok: false, error: "ElevenLabs is not configured — generated SFX unavailable" };
    const trimmed = prompt.trim();
    if (trimmed.length < 3) return { ok: false, error: "describe the sound (e.g. \"deep cinematic whoosh\")" };

    const db = createAdminClient();
    const [{ data: video }, { data: project }] = await Promise.all([
      db
        .from("videos")
        .select("id, project_id, total_cost_usd, kind, parent_video_id")
        .eq("id", videoId)
        .maybeSingle(),
      db.from("projects").select("id, budget").eq("id", projectId).maybeSingle(),
    ]);
    if (!video || !project) return { ok: false, error: "video or project not found" };

    const budget = await checkBudget(db, project, video, 0.1);
    if (!budget.ok) return { ok: false, error: budget.reason };

    const sfx = await generateSoundEffect({ prompt: trimmed, durationSec });
    // Derived shorts edit against the PARENT's asset set (the same sourceId
    // convention as validation and the render farm) — the sfx row must land
    // where those lookups read.
    const sourceId: string =
      video.kind === "short" && video.parent_video_id ? video.parent_video_id : videoId;
    const key = `videos/${sourceId}/sfx-${createHash("sha256").update(trimmed).digest("hex").slice(0, 16)}.${sfx.fileExt}`;
    await uploadMedia(key, sfx.audio, sfx.contentType);

    const { data: asset, error } = await db
      .from("assets")
      .insert({
        video_id: sourceId,
        kind: "sfx",
        provider: "elevenlabs",
        storage_path: key,
        beat_index: null,
        meta: { prompt: trimmed, durationSec: sfx.durationSec, generated: true },
        cost_usd: sfx.costUsd,
      })
      .select("id")
      .single();
    if (error || !asset) return { ok: false, error: `asset insert failed: ${error?.message}` };

    await recordCost(db, video as { id: string; project_id: string; total_cost_usd: number }, {
      provider: "elevenlabs",
      usd: sfx.costUsd,
      description: "Generated SFX",
    }, trimmed.slice(0, 80));

    refresh(projectId, videoId);
    return { ok: true, assetId: asset.id as string };
  });
}

/** Escape hatch: point the render path back at the legacy derivation. */
export async function deactivateEddAction(projectId: string, videoId: string): Promise<EditActionResult> {
  return guarded(async () => {
    const db = createAdminClient();
    const { error } = await db.from("videos").update({ edit_document_version: null }).eq("id", videoId);
    if (error) return { ok: false, error: error.message };
    refresh(projectId, videoId);
    return { ok: true };
  });
}
