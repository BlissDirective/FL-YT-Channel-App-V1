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
