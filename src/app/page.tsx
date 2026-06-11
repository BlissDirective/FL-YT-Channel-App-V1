import Link from "next/link";
import {
  Clapperboard,
  Eye,
  FileText,
  FolderPlus,
  Lightbulb,
  Plus,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getActivity,
  getMonthlyBudgetUsd,
  getPortfolioStats,
  getProjects,
  getVideos,
} from "@/lib/db/queries";
import { createDemoProject } from "@/lib/actions/projects";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { ProjectCard } from "@/components/dashboard/project-card";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default async function Home() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const [projects, allVideos, stats, activity, monthlyBudget] =
    await Promise.all([
      getProjects(),
      getVideos(),
      getPortfolioStats(),
      getActivity(),
      getMonthlyBudgetUsd(),
    ]);

  const videosByProject = new Map<string, typeof allVideos>();
  for (const v of allVideos) {
    const list = videosByProject.get(v.project_id) ?? [];
    list.push(v);
    videosByProject.set(v.project_id, list);
  }

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            All your channel projects at a glance
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02]"
        >
          <Plus className="size-4" /> New Project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Rocket} label="Projects" value={String(stats.projectCount)} />
        <StatCard
          icon={Clapperboard}
          label="In pipeline"
          value={String(stats.inPipelineCount)}
        />
        <StatCard
          icon={Eye}
          label="Published"
          value={String(stats.publishedCount)}
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const vids = videosByProject.get(p.id) ?? [];
              const inPipeline = vids.filter(
                (v) => !["TRACKING", "APPROVED", "KILLED"].includes(v.status),
              ).length;
              const health = Math.min(
                99,
                60 + vids.length * 6 + (p.voice_id ? 8 : 0),
              );
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  videoCount={vids.length}
                  inPipeline={inPipeline}
                  health={health}
                />
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Activity</CardTitle>
              {activity.length === 0 ? (
                <p className="text-sm text-muted">Nothing yet.</p>
              ) : (
                <ActivityFeed
                  items={activity.map((a) => ({
                    id: a.id,
                    icon: a.kind === "idea" ? Lightbulb : FileText,
                    title: a.title,
                    detail: a.detail,
                    time: timeAgo(a.at),
                    tone: a.kind === "idea" ? "lavender" : "accent",
                  }))}
                />
              )}
            </Card>

            <Card>
              <CardTitle linkout>Monthly spend</CardTitle>
              <p className="mb-3 flex items-center gap-1.5 text-sm text-muted">
                <TrendingUp className="size-4 text-success" />
                ${stats.monthlyCostUsd.toFixed(2)} of ${monthlyBudget.toFixed(0)}{" "}
                budget this month
              </p>
              <ProgressBar
                percent={
                  monthlyBudget > 0
                    ? (stats.monthlyCostUsd / monthlyBudget) * 100
                    : 0
                }
                label={`$${stats.monthlyCostUsd.toFixed(0)}`}
              />
              <p className="mt-3 text-xs text-muted">
                Provider costs are recorded per call once the production
                pipeline goes live (Phase 3+). Budget caps pause the pipeline
                before any overspend.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-3xl bg-accent-soft text-ink">
        <FolderPlus className="size-7" />
      </span>
      <div>
        <h3 className="font-semibold">No projects yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Create your first autonomous channel project, or seed a demo project
          to explore the studio with realistic data.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02]"
        >
          <Plus className="size-4" /> New Project
        </Link>
        <form action={createDemoProject}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full bg-card-warm px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Sparkles className="size-4" /> Seed demo project
          </button>
        </form>
      </div>
    </Card>
  );
}

function SetupNotice() {
  return (
    <div className="pt-2">
      <Card className="max-w-xl">
        <CardTitle>Finish connecting Supabase</CardTitle>
        <p className="text-sm text-muted">
          The app shell is live, but the database isn&apos;t wired yet. Add{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> to the deployment environment,
          then redeploy. Meanwhile, the{" "}
          <Link
            href="/styleguide"
            className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2"
          >
            styleguide
          </Link>{" "}
          works without a database.
        </p>
      </Card>
    </div>
  );
}
