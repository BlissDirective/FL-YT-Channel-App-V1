import { createClient } from "@/lib/supabase/server";
import type { Idea, Project, Video } from "./types";

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
