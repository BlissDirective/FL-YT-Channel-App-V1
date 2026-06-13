import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import type { Asset, CostEntry, Idea, Project, Script, Video } from "./types";

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project) ?? null;
}

export async function getVideos(projectId?: string): Promise<Video[]> {
  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;
  return (data as Video[]) ?? [];
}

export async function getIdeas(projectId: string): Promise<Idea[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .order("score", { ascending: false, nullsFirst: false });
  return (data as Idea[]) ?? [];
}

export type ActivityEntry = {
  id: string;
  kind: "video" | "idea";
  title: string;
  detail: string;
  at: string;
};

const STATUS_LABELS: Record<string, string> = {
  IDEA: "New idea card",
  IDEA_APPROVED: "Idea approved",
  SCRIPTING: "Writing script",
  SCRIPT_READY: "Script ready for review",
  GENERATING_ASSETS: "Generating assets",
  ASSETS_READY: "Assets ready for review",
  ASSEMBLING: "Rendering",
  FINAL_REVIEW: "Final render ready for review",
  APPROVED: "Approved — ready to upload",
  TRACKING: "Published & tracking",
  NEEDS_REVISION: "Revision requested",
  KILLED: "Killed",
};

/** Recent activity derived from video status changes and idea arrivals. */
export async function getActivity(limit = 8): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const [{ data: videos }, { data: ideas }, projects] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, status, updated_at, project_id")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("ideas")
      .select("id, title, created_at, project_id")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(limit),
    getProjects(),
  ]);

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const entries: ActivityEntry[] = [
    ...(videos ?? []).map((v) => ({
      id: `v-${v.id}`,
      kind: "video" as const,
      title: `${STATUS_LABELS[v.status] ?? v.status}: “${v.title}”`,
      detail: projectName.get(v.project_id) ?? "",
      at: v.updated_at,
    })),
    ...(ideas ?? []).map((i) => ({
      id: `i-${i.id}`,
      kind: "idea" as const,
      title: `New idea: “${i.title}”`,
      detail: projectName.get(i.project_id) ?? "",
      at: i.created_at,
    })),
  ];
  return entries
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}

/** Sum of every active project's monthly budget — the portfolio cap. */
export async function getMonthlyBudgetUsd(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("budget")
    .eq("status", "active");
  return (data ?? []).reduce(
    (sum, p) => sum + Number((p.budget as { monthlyUsd?: number })?.monthlyUsd ?? 0),
    0,
  );
}

export type QcReview = {
  id: string;
  video_id: string;
  gate: string;
  score: number;
  verdict: string;
  issues: string[];
  strengths: string[];
  auto_approved: boolean;
  created_at: string;
};

export type ReviewItem = {
  video: Video;
  script: Script | null;
  assets: Asset[];
  idea: Idea | null;
  qc: QcReview | null;
};

/** Videos needing attention on a project: at a review gate, mid-revision,
    or paused (budget / kill switch). */
export async function getReviewItems(projectId: string): Promise<ReviewItem[]> {
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  const attention = ((videos as Video[]) ?? []).filter(
    (v) =>
      GATE_FOR_STATUS[v.status] !== undefined ||
      v.status === "NEEDS_REVISION" ||
      (v.paused_reason && !["KILLED", "APPROVED", "TRACKING"].includes(v.status)),
  );
  if (attention.length === 0) return [];

  const ids = attention.map((v) => v.id);
  const ideaIds = attention.map((v) => v.idea_id).filter(Boolean) as string[];
  const [{ data: scripts }, { data: assets }, { data: ideas }, { data: qcRows }] =
    await Promise.all([
      supabase
        .from("scripts")
        .select("*")
        .in("video_id", ids)
        .order("version", { ascending: false }),
      supabase
        .from("assets")
        .select("*")
        .in("video_id", ids)
        .order("created_at", { ascending: true }),
      ideaIds.length
        ? supabase.from("ideas").select("*").in("id", ideaIds)
        : Promise.resolve({ data: [] as Idea[] }),
      supabase
        .from("qc_reviews")
        .select("*")
        .in("video_id", ids)
        .order("created_at", { ascending: false }),
    ]);

  // Resolve display URLs: external (Pexels) from meta, private storage via
  // short-lived signed URLs, mock paths stay null (gradient placeholders).
  const enriched = await Promise.all(
    (((assets as Asset[]) ?? [])).map(async (a) => ({
      ...a,
      url:
        (a.meta as { posterUrl?: string }).posterUrl ??
        (await getSignedMediaUrl(a.storage_path)),
    })),
  );

  return attention.map((video) => {
    const gate = GATE_FOR_STATUS[video.status];
    return {
      video,
      script:
        ((scripts as Script[]) ?? []).find((s) => s.video_id === video.id) ?? null,
      assets: enriched.filter((a) => a.video_id === video.id),
      idea: ((ideas as Idea[]) ?? []).find((i) => i.id === video.idea_id) ?? null,
      qc:
        ((qcRows as QcReview[]) ?? []).find(
          (q) => q.video_id === video.id && q.gate === gate,
        ) ?? null,
    };
  });
}

/** Count of videos waiting at a review gate, for nav badges. */
export function pendingGateCount(videos: Video[]): number {
  return videos.filter((v) => GATE_FOR_STATUS[v.status] !== undefined).length;
}

export async function getCostLedger(limit = 12): Promise<CostEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_ledger")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);
  return (data as CostEntry[]) ?? [];
}

export async function getKillSwitch(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean })?.enabled);
}

export type PortfolioStats = {
  projectCount: number;
  publishedCount: number;
  inPipelineCount: number;
  monthlyCostUsd: number;
};

export async function getPortfolioStats(): Promise<PortfolioStats> {
  const supabase = await createClient();
  const [{ count: projectCount }, videos, { data: ledger }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    getVideos(),
    supabase
      .from("cost_ledger")
      .select("usd, at")
      .gte(
        "at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      ),
  ]);

  const publishedCount = videos.filter(
    (v) => v.status === "TRACKING" || v.youtube_video_id,
  ).length;
  const inPipelineCount = videos.filter(
    (v) => !["TRACKING", "APPROVED", "KILLED"].includes(v.status),
  ).length;
  const monthlyCostUsd = (ledger ?? []).reduce(
    (sum, r) => sum + Number(r.usd ?? 0),
    0,
  );

  return {
    projectCount: projectCount ?? 0,
    publishedCount,
    inPipelineCount,
    monthlyCostUsd,
  };
}
