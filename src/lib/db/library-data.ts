import "server-only";
import { GATE_FOR_STATUS, GATE_LABELS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import type { Idea, Video } from "./types";
import { getVideos } from "./queries";
import { publishDiagnosis } from "./pipeline";
import { tileState, type LibrarySectionKey, type TileState } from "./library";

/**
 * Server assembly for the per-project Library (UI v2 Phase 2, D-2..D-5,
 * D-17/D-18). Read-only: one videos fetch + batched child lookups, the same
 * pattern as getReviewItems. All classification is the pure library core.
 */

export type LibraryItem = {
  video: Video;
  tile: TileState;
  /** Latest QC score across gates — the tile's "QC label as it develops". */
  qcScore: number | null;
  gateLabel: string | null;
  thumbUrl: string | null;
  views: number | null;
  /** Why the tile is flagged (paused_reason / gate / publish diagnosis). */
  awaitingLabel: string | null;
};

export type LibraryData = {
  sections: Record<LibrarySectionKey, LibraryItem[]>;
  /** Un-promoted intelligence idea cards (D-18) — merged into the Ideas
      section with an origin badge. */
  ideaCards: Idea[];
  attentionCount: number;
  monthSpendUsd: number;
  operatorState: "off" | "copilot" | "autopilot";
};

export async function getLibrary(projectId: string): Promise<LibraryData> {
  const supabase = await createClient();
  const videos = await getVideos(projectId);
  const ids = videos.map((v) => v.id);

  const [{ data: qcRows }, { data: thumbs }, { data: snapshots }, { data: ideas }, { data: ledger }, { data: operator }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("qc_reviews")
            .select("video_id, score, created_at")
            .in("video_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("assets")
            .select("video_id, kind, storage_path, meta, created_at")
            .in("video_id", ids)
            .eq("kind", "thumb")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("analytics_snapshots")
            .select("video_id, views, created_at")
            .in("video_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("ideas")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "new")
        .order("score", { ascending: false, nullsFirst: false }),
      supabase
        .from("cost_ledger")
        .select("usd")
        .eq("project_id", projectId)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from("operator_runs")
        .select("status, config")
        .eq("project_id", projectId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
    ]);

  const latestQc = new Map<string, number>();
  for (const q of (qcRows ?? []) as { video_id: string; score: number }[]) {
    if (!latestQc.has(q.video_id)) latestQc.set(q.video_id, Number(q.score));
  }
  const latestViews = new Map<string, number>();
  for (const s of (snapshots ?? []) as { video_id: string; views: number }[]) {
    if (!latestViews.has(s.video_id)) latestViews.set(s.video_id, Number(s.views));
  }

  // One thumb per video: prefer the operator-selected one, else the newest.
  type ThumbRow = { video_id: string; storage_path: string; meta: { selected?: boolean; posterUrl?: string } };
  const thumbFor = new Map<string, ThumbRow>();
  for (const t of ((thumbs ?? []) as ThumbRow[])) {
    const existing = thumbFor.get(t.video_id);
    if (!existing || (t.meta?.selected && !existing.meta?.selected)) thumbFor.set(t.video_id, t);
  }
  const thumbUrls = new Map<string, string | null>();
  await Promise.all(
    Array.from(thumbFor.entries()).map(async ([vid, t]) => {
      thumbUrls.set(vid, t.meta?.posterUrl ?? (await getSignedMediaUrl(t.storage_path)));
    }),
  );

  const sections: Record<LibrarySectionKey, LibraryItem[]> = {
    ideas: [],
    script: [],
    production: [],
    ready: [],
    published: [],
  };
  let attentionCount = 0;

  for (const video of videos) {
    const tile = tileState(video);
    if (!tile.section) continue;
    const gate = GATE_FOR_STATUS[video.status];
    const diagnosis = video.status === "APPROVED" ? publishDiagnosis(video) : null;
    const item: LibraryItem = {
      video,
      tile,
      qcScore: latestQc.get(video.id) ?? null,
      gateLabel: gate ? `${GATE_LABELS[gate]} gate` : null,
      thumbUrl: thumbUrls.get(video.id) ?? null,
      views: tile.section === "published" ? (latestViews.get(video.id) ?? null) : null,
      awaitingLabel:
        video.paused_reason ??
        (diagnosis && diagnosis.state !== "live" && diagnosis.message
          ? diagnosis.message
          : null),
    };
    if (tile.awaitingYou) attentionCount += 1;
    sections[tile.section].push(item);
  }

  // Un-promoted intelligence cards: status "new" AND no video references them.
  const usedIdeaIds = new Set(videos.map((v) => v.idea_id).filter(Boolean));
  const ideaCards = (((ideas ?? []) as Idea[])).filter((i) => !usedIdeaIds.has(i.id));

  const monthSpendUsd = ((ledger ?? []) as { usd: number }[]).reduce(
    (sum, r) => sum + Number(r.usd ?? 0),
    0,
  );

  const operatorConfig = (operator as { config?: { autonomy?: string } } | null)?.config;
  const operatorState: LibraryData["operatorState"] = operator
    ? operatorConfig?.autonomy === "autopilot"
      ? "autopilot"
      : "copilot"
    : "off";

  return { sections, ideaCards, attentionCount, monthSpendUsd, operatorState };
}
