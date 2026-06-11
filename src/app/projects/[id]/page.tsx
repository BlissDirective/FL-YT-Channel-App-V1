import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clapperboard,
  FileText,
  Film,
  Lightbulb,
  Settings,
  Upload,
} from "lucide-react";
import { PIPELINE_STAGES } from "@studio/core";
import { getIdeas, getProject, getVideos } from "@/lib/db/queries";
import { emphasisStage, stageCounts } from "@/lib/db/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { FlowDiagram } from "@/components/ui/flow-diagram";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";

const STAGE_ICONS = {
  ideas: Lightbulb,
  script: FileText,
  assets: Film,
  render: Clapperboard,
  ready: Upload,
} as const;

export default async function ProjectHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [videos, ideas] = await Promise.all([getVideos(id), getIdeas(id)]);
  const counts = stageCounts(videos);
  const emphasis = emphasisStage(counts);
  const newIdeas = ideas.filter((i) => i.status === "new").length;
  const published = videos.filter(
    (v) => v.status === "TRACKING" || v.youtube_video_id,
  ).length;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            Overview
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip tone={project.status === "active" ? "success" : "neutral"}>
              {project.status === "active" ? "Active" : "Paused"}
            </StatusChip>
            {project.niche && <StatusChip tone="warning">{project.niche}</StatusChip>}
            {project.voice_name && (
              <StatusChip tone="lavender">Voice: {project.voice_name}</StatusChip>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${id}/settings`}
          className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
        >
          <Settings className="size-4" /> Settings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clapperboard} label="Videos" value={String(videos.length)} />
        <StatCard icon={Lightbulb} label="New ideas" value={String(newIdeas)} />
        <StatCard icon={Upload} label="Published" value={String(published)} />
      </div>

      <Card>
        <CardTitle>Production pipeline</CardTitle>
        <FlowDiagram
          nodes={PIPELINE_STAGES.map((s) => ({
            key: s.key,
            label: s.label,
            icon: STAGE_ICONS[s.key as keyof typeof STAGE_ICONS],
            count: counts[s.key],
            emphasis: s.key === emphasis,
          }))}
        />
        <p className="mt-4 text-sm text-muted">
          The production line — daily ideas, scripting, asset generation,
          rendering, and review gates — comes online in Phases 3–6. For now this
          reflects the videos seeded in this project.
        </p>
      </Card>

      <Card>
        <CardTitle>Recent videos</CardTitle>
        {videos.length === 0 ? (
          <p className="text-sm text-muted">No videos yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {videos.slice(0, 8).map((v) => (
              <li key={v.id} className="flex items-center justify-between py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {v.title}
                </span>
                <StatusChip tone="neutral">
                  {v.status.replace(/_/g, " ").toLowerCase()}
                </StatusChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
