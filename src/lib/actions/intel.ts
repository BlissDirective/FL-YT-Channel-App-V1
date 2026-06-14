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
import { analyzeYoutubeVideo } from "@/lib/adapters/gemini-video";
import type { IntelCompetitor, Perception, VideoIntel } from "@/lib/db/types";

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
  depth?: "quick" | "deep";
  sourceUrl?: string;
  vouched?: boolean;
}): Promise<IntelActionResult> {
  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: "Add a topic or keywords to scan." };

  const depth = input.depth === "deep" ? "deep" : "quick";
  const sourceUrl = input.sourceUrl?.trim() || "";
  if (depth === "deep") {
    if (!sourceUrl) return { ok: false, error: "Deep scan needs a video URL to analyze." };
    if (!input.vouched) {
      return { ok: false, error: "Confirm research-use to run a deep scan." };
    }
  }

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

    // 2) Deep scan: Gemini native-URL perception (no download) folded in.
    let perception: Perception | null = null;
    let perceptionNotes: string | undefined;
    let geminiCost = 0;
    if (depth === "deep") {
      const g = await analyzeYoutubeVideo({ url: sourceUrl });
      perception = g.perception;
      geminiCost = g.costUsd;
      perceptionNotes = g.perception.notes
        .map(
          (n) =>
            `[${n.t}s] ${n.sceneDesc}${n.onScreenText ? ` | text: ${n.onScreenText}` : ""}${n.pacingNote ? ` | ${n.pacingNote}` : ""}`,
        )
        .join("\n");
      if (geminiCost > 0) {
        await supabase.from("cost_ledger").insert({
          project_id: input.projectId,
          video_id: input.videoId ?? null,
          provider: g.provider,
          description: "Video intel · deep perception (Gemini)",
          usd: geminiCost,
        });
      }
    }

    // 3) Analyze → blueprint.
    const transcript = input.transcript?.trim() || perception?.transcript || undefined;
    const { blueprint, costUsd, provider } = await analyzeVideoIntel({
      topic,
      niche: project.niche,
      audience: project.audience,
      angle: project.angle,
      competitors,
      transcript,
      perceptionNotes,
    });

    // 4) Record Claude cost (analysis only; no per-video total to bump here).
    if (costUsd > 0) {
      await supabase.from("cost_ledger").insert({
        project_id: input.projectId,
        video_id: input.videoId ?? null,
        provider,
        description: "Video intelligence scan",
        usd: costUsd,
      });
    }

    // 5) Persist the scan.
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
        depth,
        source_url: depth === "deep" ? sourceUrl : null,
        vouched: Boolean(input.vouched),
        perception,
        cost_usd: Math.round((costUsd + geminiCost) * 100) / 100,
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
