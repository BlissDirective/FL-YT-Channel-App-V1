import "server-only";
import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getOperatorEvents, getVideos } from "./queries";

/**
 * The per-project activity feed (UI v2 Phase 5, D-16): system events —
 * video status changes, holds, autofix outcomes, operator + boost events —
 * as one read-only stream. Insights and intel scans render as their own
 * actionable cards beside these entries (feed page). Derivation-only; the
 * feed never mutates anything.
 */

export type FeedEntry = {
  id: string;
  at: string;
  category: "system" | "needs-action";
  title: string;
  detail?: string;
  href?: string;
};

const STATUS_LABELS: Record<string, string> = {
  IDEA: "New idea",
  IDEA_APPROVED: "Idea approved",
  SCRIPTING: "Writing script",
  SCRIPT_READY: "Script ready for review",
  GENERATING_ASSETS: "Generating assets",
  ASSETS_READY: "Assets ready for review",
  ASSEMBLING: "Rendering",
  FINAL_REVIEW: "Final render ready for review",
  APPROVED: "Approved — ready to publish",
  TRACKING: "Published & tracking",
  NEEDS_REVISION: "Revision in progress",
  KILLED: "Killed",
};

export async function getFeedEntries(projectId: string, limit = 40): Promise<FeedEntry[]> {
  const supabase = await createClient();
  const [videos, operatorEvents, { data: autofixRuns }, { data: buildRuns }] =
    await Promise.all([
      getVideos(projectId),
      getOperatorEvents(projectId, 20),
      supabase
        .from("autofix_runs")
        .select("id, video_id, loop, attempt, from_score, to_score, status, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("build_runs")
        .select("id, status, count, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const canvas = (videoId: string) => `/projects/${projectId}/videos/${videoId}`;
  const entries: FeedEntry[] = [];

  for (const v of videos) {
    const atGate = GATE_FOR_STATUS[v.status] !== undefined;
    const held = Boolean(v.paused_reason) && !["KILLED", "TRACKING"].includes(v.status);
    entries.push({
      id: `video-${v.id}-${v.updated_at}`,
      at: v.updated_at,
      category: atGate || held ? "needs-action" : "system",
      title: `${STATUS_LABELS[v.status] ?? v.status}: “${v.title}”`,
      detail: held ? `⏸ ${v.paused_reason}` : undefined,
      href: canvas(v.id),
    });
  }

  for (const e of operatorEvents) {
    entries.push({
      id: `op-${e.id}`,
      at: e.created_at,
      category: e.kind === "held" ? "needs-action" : "system",
      title: e.message,
    });
  }

  type AutofixRow = {
    id: string;
    video_id: string;
    loop: string;
    attempt: number;
    from_score: number | null;
    to_score: number | null;
    status: string;
    created_at: string;
  };
  for (const r of ((autofixRuns ?? []) as AutofixRow[])) {
    const delta =
      r.from_score != null && r.to_score != null
        ? ` (${Number(r.from_score).toFixed(1)} → ${Number(r.to_score).toFixed(1)})`
        : "";
    entries.push({
      id: `autofix-${r.id}`,
      at: r.created_at,
      category: r.status === "held" ? "needs-action" : "system",
      title: `Autofix attempt ${r.attempt} ${r.status}${delta}`,
      href: canvas(r.video_id),
    });
  }

  type BuildRow = { id: string; status: string; count: number; created_at: string };
  for (const r of ((buildRuns ?? []) as BuildRow[])) {
    entries.push({
      id: `boost-${r.id}`,
      at: r.created_at,
      category: "system",
      title: `Boost run — ${r.count} video${r.count === 1 ? "" : "s"} (${r.status})`,
      href: `/projects/${projectId}/autopilot`,
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}
