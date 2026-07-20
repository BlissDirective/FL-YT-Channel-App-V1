import "server-only";
import { GATE_FOR_STATUS, GATE_LABELS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import type { Idea, Video } from "./types";
import { getVideos } from "./queries";
import { publishDiagnosis } from "./pipeline";
import { activeLibraryCount, liveProgress, tileState, type LibrarySectionKey, type TileState } from "./library";

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
  /** Set when a video is silently frozen in a worker-dependent status (no
      paused_reason, no gate) for longer than expected — the render/clip/agent
      cron likely hasn't run. Surfaces a label + a "Nudge worker" action so an
      invisible stall becomes visible and actionable. */
  stalled: { label: string } | null;
  /** Live progress while an agent is actively working the asset (#3). `done`/
      `total` are set for asset generation ("3/8 clips"); other stages carry a
      label only. Null when the asset isn't actively processing. */
  progress: { label: string; done?: number; total?: number } | null;
};

export type LibraryData = {
  sections: Record<LibrarySectionKey, LibraryItem[]>;
  /** Un-promoted intelligence idea cards (D-18) — merged into the Ideas
      section with an origin badge. */
  ideaCards: Idea[];
  attentionCount: number;
  monthSpendUsd: number;
  operatorState: "off" | "copilot" | "autopilot";
  /** Archived assets (Clean House §4) — kept out of the active sections. */
  archived: LibraryItem[];
  /** Count of assets occupying the working library (guardrail §5). */
  activeCount: number;
};

export async function getLibrary(projectId: string): Promise<LibraryData> {
  const supabase = await createClient();
  const videos = await getVideos(projectId);
  const ids = videos.map((v) => v.id);
  // Videos an agent (or a director-triggered stage agent) is working right now.
  // We fetch their clip counts + beat counts to show live progress on the tile.
  const PROCESSING = new Set(["SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING", "NEEDS_REVISION"]);
  const activeIds = videos.filter((v) => PROCESSING.has(v.status)).map((v) => v.id);

  const [
    { data: qcRows },
    { data: thumbs },
    { data: snapshots },
    { data: ideas },
    { data: ledger },
    { data: operator },
    { data: clipRows },
    { data: scriptRows },
  ] = await Promise.all([
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
      // Generated clips per actively-processing video (for "N/M clips" progress).
      activeIds.length
        ? supabase.from("assets").select("video_id, kind").in("video_id", activeIds).eq("kind", "clip")
        : Promise.resolve({ data: [] }),
      // The latest script's beats (M) per active video — newest version first.
      activeIds.length
        ? supabase.from("scripts").select("video_id, beats, version").in("video_id", activeIds).order("version", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const latestQc = new Map<string, number>();
  for (const q of (qcRows ?? []) as { video_id: string; score: number }[]) {
    if (!latestQc.has(q.video_id)) latestQc.set(q.video_id, Number(q.score));
  }
  const latestViews = new Map<string, number>();
  for (const s of (snapshots ?? []) as { video_id: string; views: number }[]) {
    if (!latestViews.has(s.video_id)) latestViews.set(s.video_id, Number(s.views));
  }

  // Live-progress inputs: generated clips (N) and beats (M) per active video.
  const clipCount = new Map<string, number>();
  for (const a of (clipRows ?? []) as { video_id: string }[]) {
    clipCount.set(a.video_id, (clipCount.get(a.video_id) ?? 0) + 1);
  }
  const beatCount = new Map<string, number>();
  for (const s of (scriptRows ?? []) as { video_id: string; beats: unknown[] | null }[]) {
    if (!beatCount.has(s.video_id)) beatCount.set(s.video_id, (s.beats ?? []).length);
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
  const archivedItems: LibraryItem[] = [];
  const now = Date.now();
  // How long a video may sit in a worker-dependent status before we call it a
  // stall (the render/clip cron cadence is ~30 min; renders may legitimately run
  // to their 45-min wall-clock budget, so ASSEMBLING gets a wider window).
  const STALL_MINUTES: Partial<Record<string, number>> = {
    SCRIPTING: 30,
    GENERATING_ASSETS: 30,
    NEEDS_REVISION: 30,
    ASSEMBLING: 60,
  };

  for (const video of videos) {
    const tile = tileState(video);
    if (!tile.section) continue;
    const published = tile.section === "published";
    // A published/live asset shows no gate label, no pending reason, and no
    // quick actions — it is done (mirrors tileState.awaitingYou = false).
    const gate = published ? undefined : GATE_FOR_STATUS[video.status];
    const diagnosis =
      !published && video.status === "APPROVED" ? publishDiagnosis(video) : null;
    // Ready-to-publish (APPROVED, not yet live): the forward action is
    // publishing, not "resume". Show the publish diagnosis (e.g. "open the
    // Publish Kit to upload"), never a stale hold reason left over from an
    // earlier gate.
    const readyToPublish = tile.section === "ready";
    const awaitingLabel = published
      ? null
      : readyToPublish
        ? (diagnosis && diagnosis.state !== "live" ? diagnosis.message : null) ||
          "Ready to publish — open to upload."
        : (video.paused_reason ??
          (diagnosis && diagnosis.state !== "live" && diagnosis.message
            ? diagnosis.message
            : null));
    // Invisible-stall detection: a non-gate worker-dependent status with no
    // paused_reason that hasn't moved within its window means the driving cron
    // (render/clips/agent) likely hasn't run. Gate statuses are excluded — those
    // already show quick actions.
    const stallWindow = STALL_MINUTES[video.status];
    const ageMin = (now - new Date(video.updated_at).getTime()) / 60000;
    const stalled =
      !published && gate === undefined && !video.paused_reason && stallWindow != null && ageMin >= stallWindow
        ? { label: `Stalled — no worker activity for ${Math.round(ageMin)}m` }
        : null;
    const item: LibraryItem = {
      video,
      tile,
      qcScore: latestQc.get(video.id) ?? null,
      gateLabel: gate ? `${GATE_LABELS[gate]} gate` : null,
      thumbUrl: thumbUrls.get(video.id) ?? null,
      views: published ? (latestViews.get(video.id) ?? null) : null,
      awaitingLabel: stalled ? stalled.label : awaitingLabel,
      stalled,
      // Live progress only when genuinely working (not stalled/paused/at a gate).
      progress:
        stalled || video.paused_reason || gate !== undefined
          ? null
          : liveProgress(video.status, clipCount.get(video.id) ?? 0, beatCount.get(video.id)),
    };
    // Archived assets (Clean House §4) leave the active sections entirely.
    if (video.archived) {
      archivedItems.push(item);
      continue;
    }
    if (stalled) attentionCount += 1;
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

  return {
    sections,
    ideaCards,
    attentionCount,
    monthSpendUsd,
    operatorState,
    archived: archivedItems,
    activeCount: activeLibraryCount(videos),
  };
}
