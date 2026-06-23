import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clapperboard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Film,
  Inbox,
  Lightbulb,
  Settings,
  Upload,
} from "lucide-react";
import { PIPELINE_STAGES } from "@studio/core";
import {
  getBuildRuns,
  getIdeas,
  getKillSwitch,
  getProject,
  getTrackedStats,
  getVideos,
  pendingGateCount,
} from "@/lib/db/queries";
import { emphasisStage, stageCounts } from "@/lib/db/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { FlowDiagram } from "@/components/ui/flow-diagram";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { RunDemoButton } from "@/components/dashboard/run-demo-button";
import { RunIntelligenceButton } from "@/components/dashboard/run-intelligence-button";
import { QueueTopic } from "@/components/dashboard/queue-topic";
import { ScoutChat } from "@/components/dashboard/scout-chat";
import { NeedsAttention } from "./needs-attention";
import { BuildAndPost } from "./build/build-and-post";
import { BuildRunsPanel } from "./build/build-runs-panel";

export const dynamic = "force-dynamic";
// Live script + voiceover stages run inside actions on this route.
export const maxDuration = 300;

const STAGE_ICONS = {
  ideas: Lightbulb,
  script: FileText,
  assets: Film,
  render: Clapperboard,
  ready: Upload,
} as const;

function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export default async function ProjectHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [videos, killSwitch, tracked, buildRuns, ideas] = await Promise.all([
    getVideos(id),
    getKillSwitch(),
    getTrackedStats(id),
    getBuildRuns(id),
    getIdeas(id),
  ]);
  const ideaOptions = ideas
    .filter((i) => i.status !== "dismissed")
    .map((i) => ({ id: i.id, title: i.title, angle: i.angle }));
  const totalViews = tracked.reduce((s, t) => s + t.views, 0);
  const estRevenueUsd = tracked.reduce((s, t) => s + t.estRevenueUsd, 0);
  const counts = stageCounts(videos);
  const emphasis = emphasisStage(counts);
  const pending = pendingGateCount(videos);
  const published = videos.filter(
    (v) => v.status === "TRACKING" || v.youtube_video_id,
  ).length;
  const spend = videos.reduce((s, v) => s + Number(v.total_cost_usd), 0);
  // "Needs attention" = a stalled video. Exclude states that have already
  // reached a successful waypoint (rendered/assets-done/published/terminal) —
  // those can carry a stale paused_reason from an earlier, since-recovered fail.
  const pausedVideos = videos.filter(
    (v) =>
      v.paused_reason &&
      !["KILLED", "APPROVED", "TRACKING", "FINAL_REVIEW", "ASSETS_READY"].includes(v.status),
  );

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "ideas", "projects", "approvals", "build_runs"]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            Overview
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip tone={project.status === "active" ? "success" : "neutral"}>
              {project.status === "active" ? "Active" : "Paused"}
            </StatusChip>
            {project.niche && <StatusChip tone="warning">{project.niche}</StatusChip>}
            {project.voice_name && (
              <StatusChip tone="lavender">Voice: {project.voice_name}</StatusChip>
            )}
            {killSwitch && <StatusChip tone="coral">Kill switch on</StatusChip>}
            {pausedVideos.length > 0 && (
              <a href="#needs-attention">
                <StatusChip tone="coral">
                  ⚠ {pausedVideos.length} need{pausedVideos.length === 1 ? "s" : ""} attention
                </StatusChip>
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BuildAndPost projectId={id} ideas={ideaOptions} />
          <RunIntelligenceButton projectId={id} />
          <RunDemoButton projectId={id} />
          <Link
            href={`/projects/${id}/review`}
            className="relative flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Inbox className="size-4" /> Review queue
            {pending > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-coral text-[11px] font-bold text-white">
                {pending}
              </span>
            )}
          </Link>
          <Link
            href={`/projects/${id}/downloads`}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Download className="size-4" /> Downloads
          </Link>
          <Link
            href={`/projects/${id}/settings`}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Settings className="size-4" /> Settings
          </Link>
        </div>
      </div>

      <NeedsAttention
        projectId={id}
        videos={pausedVideos.map((v) => ({
          id: v.id,
          title: v.title,
          status: v.status,
          reason: v.paused_reason ?? "Paused — open to see details.",
        }))}
      />

      <BuildRunsPanel projectId={id} runs={buildRuns} />

      <QueueTopic projectId={id} />

      <ScoutChat projectId={id} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Lightbulb} label="Ideas" value={String(counts.ideas)} />
        <StatCard
          icon={Film}
          label="In production"
          value={String(counts.script + counts.assets + counts.render)}
        />
        <StatCard icon={Upload} label="Published" value={String(published)} />
        <StatCard icon={Eye} label="Total views" value={compact(totalViews)} />
        <StatCard
          icon={DollarSign}
          label="Est. revenue"
          value={`$${estRevenueUsd.toFixed(2)}`}
        />
        <StatCard
          icon={DollarSign}
          label="Production spend"
          value={`$${spend.toFixed(2)}`}
        />
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
            href: `/projects/${id}/review?stage=${s.key}`,
          }))}
        />
        <p className="mt-4 text-sm text-muted">
          {pending > 0
            ? `${pending} video${pending === 1 ? "" : "s"} waiting at a review gate — open the review queue to decide.`
            : "Run the demo pipeline to send a mock video through every stage and gate. Live providers arrive in Phases 4–6."}
        </p>
      </Card>

      <Card>
        <CardTitle>Recent videos</CardTitle>
        {videos.length === 0 ? (
          <p className="text-sm text-muted">No videos yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {videos.slice(0, 8).map((v) => (
              <li key={v.id}>
                <Link
                  href={`/projects/${id}/videos/${v.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {v.title}
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    ${Number(v.total_cost_usd).toFixed(2)}
                  </span>
                  <StatusChip
                    tone={
                      v.status === "KILLED"
                        ? "coral"
                        : v.status === "APPROVED" || v.status === "TRACKING"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {v.status.replace(/_/g, " ").toLowerCase()}
                  </StatusChip>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
