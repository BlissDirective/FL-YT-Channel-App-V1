"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { selectShortSegments } from "@/lib/adapters/shorts";
import type { CuratedHighlight, ScriptBeat, Video } from "@/lib/db/types";

export type ShortsResult = { ok: boolean; error?: string; count?: number };

function refresh(projectId: string, parentVideoId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/videos/${parentVideoId}`);
}

/**
 * Derive N vertical Shorts from a finished long-form. Picks self-contained
 * segments (smart = Claude, else a free heuristic), creates a `kind='short'`
 * video row per segment that reuses the parent's rendered assets (no new
 * VO/clip spend), and queues each for render. The single LLM cost is logged to
 * the parent's ledger.
 */
export async function deriveShortsAction(
  projectId: string,
  parentVideoId: string,
  opts: { count: number; smart: boolean },
): Promise<ShortsResult> {
  try {
    const supabase = await createClient();

    const { data: parent } = await supabase
      .from("videos")
      .select("*")
      .eq("id", parentVideoId)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Parent video not found." };
    if ((parent as Video).kind === "short") {
      return { ok: false, error: "You can only derive Shorts from a long-form video." };
    }

    const { data: script } = await supabase
      .from("scripts")
      .select("beats")
      .eq("video_id", parentVideoId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const beats = ((script?.beats as ScriptBeat[] | undefined) ?? []).filter((b) => b.text?.trim());
    if (beats.length < 2) {
      return { ok: false, error: "This video has no usable script to cut Shorts from." };
    }

    // Repurposing reuses the parent's rendered assets — require live (non-mock)
    // VO so the render farm can actually produce these Shorts.
    const { data: assets } = await supabase
      .from("assets")
      .select("kind, beat_index, storage_path, meta")
      .eq("video_id", parentVideoId);
    const voAssets = (assets ?? []).filter(
      (a) => a.kind === "vo" && a.storage_path && !String(a.storage_path).startsWith("mock/"),
    );
    if (voAssets.length === 0) {
      return {
        ok: false,
        error: "Derive Shorts needs a video rendered from live assets (this one has no real voiceover).",
      };
    }
    const voDuration = new Map<number, number>();
    for (const a of voAssets) {
      const d = Number((a.meta as { durationSec?: number })?.durationSec ?? 0);
      if (a.beat_index != null) voDuration.set(a.beat_index, d || 6);
    }

    const project = await getProjectMeta(supabase, parent.project_id);
    const selection = await selectShortSegments({
      title: parent.title,
      niche: project.niche,
      topic: parent.topic,
      tone: project.tone,
      format: parent.format,
      beats,
      count: Math.max(1, Math.min(opts.count, 6)),
      smart: opts.smart,
    });
    if (selection.segments.length === 0) {
      return { ok: false, error: "Couldn't find any standalone segments to cut." };
    }

    const parentHighlights = (parent.enable_highlights
      ? ((parent.highlights as CuratedHighlight[] | null) ?? [])
      : []) as CuratedHighlight[];

    const rows = selection.segments.map((seg) => {
      const lengthSec = Math.max(
        8,
        Math.round(seg.beats.reduce((s, idx) => s + (voDuration.get(idx) ?? 6), 0)),
      );
      // Inherit the parent's curated highlights that fall on these beats; timing
      // re-resolves at render from the (reused) beat word timestamps.
      const inherited = parentHighlights
        .filter((h) => seg.beats.includes(h.beatIdx))
        .map((h, i) => ({ ...h, id: `hl_${i + 1}` }));
      return {
        project_id: parent.project_id,
        idea_id: null,
        title: seg.title,
        topic: parent.topic,
        format: parent.format,
        kind: "short",
        parent_video_id: parentVideoId,
        source_segment: { beats: seg.beats, label: seg.label, caption: seg.caption },
        target_length_sec: lengthSec,
        status: "ASSEMBLING",
        enable_highlights: inherited.length > 0,
        highlight_count: inherited.length,
        highlights: inherited,
      };
    });

    const { error: insErr } = await supabase.from("videos").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };

    if (selection.costUsd > 0) {
      await supabase.from("cost_ledger").insert({
        project_id: parent.project_id,
        video_id: parentVideoId,
        provider: "anthropic",
        description: `Shorts segment selection (${selection.segments.length}) — ${selection.provider}`,
        usd: selection.costUsd,
      });
      await supabase
        .from("videos")
        .update({ total_cost_usd: Number(parent.total_cost_usd) + selection.costUsd })
        .eq("id", parentVideoId);
    }

    refresh(projectId, parentVideoId);
    return { ok: true, count: rows.length };
  } catch (err) {
    console.error("deriveShortsAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * One-tap publish for a staged Short. Flags it for the render farm, which holds
 * the YouTube OAuth credentials and uploads the staged 9:16 cut on its next
 * pass (the app never holds OAuth). If the farm has no OAuth configured the
 * operator still has the manual download + "mark uploaded" path.
 */
export async function publishShortAction(
  projectId: string,
  parentVideoId: string,
  shortVideoId: string,
): Promise<ShortsResult> {
  try {
    const supabase = await createClient();
    const { data: short } = await supabase
      .from("videos")
      .select("id, kind, status, youtube_video_id")
      .eq("id", shortVideoId)
      .maybeSingle();
    if (!short || short.kind !== "short") return { ok: false, error: "Not a Short." };
    if (short.youtube_video_id) return { ok: false, error: "This Short is already published." };
    if (short.status !== "FINAL_REVIEW") {
      return { ok: false, error: "This Short isn't rendered yet." };
    }
    const { error } = await supabase
      .from("videos")
      .update({ publish_requested: true })
      .eq("id", shortVideoId);
    if (error) return { ok: false, error: error.message };
    refresh(projectId, parentVideoId);
    return { ok: true };
  } catch (err) {
    console.error("publishShortAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getProjectMeta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ niche: string; tone: string }> {
  const { data } = await supabase
    .from("projects")
    .select("niche, tone")
    .eq("id", projectId)
    .maybeSingle();
  return { niche: data?.niche ?? "", tone: data?.tone ?? "" };
}
