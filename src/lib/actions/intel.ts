"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/db/queries";
import {
  fetchVideoStats,
  parseYoutubeId,
  searchNiche,
} from "@/lib/adapters/youtube";
import { analyzeVideoIntel } from "@/lib/adapters/video-intel";
import type { IntelCompetitor, VideoIntel } from "@/lib/db/types";

export type IntelActionResult =
  | { ok: true; intel: VideoIntel }
  | { ok: false; error: string };

/** Phase A market-intelligence scan — synchronous (Data-API metadata + optional
    transcript → Claude blueprint). No worker, no gate. */
export async function runVideoIntelAction(input: {
  projectId: string;
  videoId?: string | null;
  topic: string;
  competitorUrls?: string[];
  transcript?: string;
}): Promise<IntelActionResult> {
  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: "Add a topic or keywords to scan." };

  try {
    const supabase = await createClient();
    const project = await getProject(input.projectId);
    if (!project) return { ok: false, error: "Project not found." };

    // 1) Gather competitors: niche search + any operator-pasted URLs.
    const searchQuery = [project.niche, topic].filter(Boolean).join(" ");
    const found = await searchNiche(searchQuery || topic, 10);

    const pastedIds = (input.competitorUrls ?? [])
      .map((u) => parseYoutubeId(u))
      .filter((v): v is string => Boolean(v));
    const pastedStats = pastedIds.length ? await fetchVideoStats(pastedIds) : [];

    const byId = new Map<string, IntelCompetitor>();
    for (const v of found) {
      byId.set(v.videoId, {
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channelTitle,
        views: v.views,
        url: v.url,
        publishedAt: v.publishedAt,
      });
    }
    for (const s of pastedStats) {
      byId.set(s.videoId, {
        videoId: s.videoId,
        title: s.title ?? "Untitled",
        channelTitle: "",
        views: s.views,
        url: `https://youtu.be/${s.videoId}`,
        publishedAt: s.publishedAt ?? "",
      });
    }
    const competitors = [...byId.values()].sort((a, b) => b.views - a.views).slice(0, 12);

    // 2) Analyze → blueprint.
    const transcript = input.transcript?.trim() || undefined;
    const { blueprint, costUsd, provider } = await analyzeVideoIntel({
      topic,
      niche: project.niche,
      audience: project.audience,
      angle: project.angle,
      competitors,
      transcript,
    });

    // 3) Record cost (analysis only; no per-video total to bump here).
    if (costUsd > 0) {
      await supabase.from("cost_ledger").insert({
        project_id: input.projectId,
        video_id: input.videoId ?? null,
        provider,
        description: "Video intelligence scan",
        usd: costUsd,
      });
    }

    // 4) Persist the scan.
    const { data, error } = await supabase
      .from("video_intel")
      .insert({
        project_id: input.projectId,
        video_id: input.videoId ?? null,
        topic,
        competitors,
        transcript: transcript ?? null,
        blueprint,
        status: "done",
        cost_usd: costUsd,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/intel");
    return { ok: true, intel: data as VideoIntel };
  } catch (err) {
    console.error("runVideoIntelAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
