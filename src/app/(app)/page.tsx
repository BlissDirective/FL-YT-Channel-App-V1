import Link from "next/link";
import {
  Clapperboard,
  DollarSign,
  Download,
  Eye,
  FolderPlus,
  Plus,
  Rocket,
  Sparkles,
  Upload,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getMonthlyBudgetUsd,
  getPortfolioStats,
  getProjects,
  getVideos,
} from "@/lib/db/queries";
import { createDemoProject } from "@/lib/actions/projects";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { SystemPulse } from "@/components/dashboard/system-pulse";
import { AwaitingYouRow } from "@/components/dashboard/awaiting-you";
import { GenerateInsightsButton } from "@/app/(app)/insights/insights-list";
import { tileState } from "@/lib/db/library";

export const dynamic = "force-dynamic";

function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export default async function Home() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const [projects, allVideos, stats, monthlyBudget] = await Promise.all([
    getProjects(),
    getVideos(),
    getPortfolioStats(),
    getMonthlyBudgetUsd(),
  ]);

  const videosByProject = new Map<string, typeof allVideos>();
  for (const v of allVideos) {
    const list = videosByProject.get(v.project_id) ?? [];
    list.push(v);
    videosByProject.set(v.project_id, list);
  }

  // Idea-gate pass rate per project (Phase 8 economics): the share of
  // researched ideas that survived the gate. A consistently low rate means
  // the niche/angle is starving the channel of usable topics.
  const supabase = await createClient();
  const { data: ideaRows } = await supabase.from("ideas").select("project_id, flag, status");
  const ideaPassRates = new Map<string, number>();
  {
    const byProject = new Map<string, { total: number; passed: number }>();
    for (const i of (ideaRows ?? []) as { project_id: string; flag: string | null; status: string }[]) {
      const agg = byProject.get(i.project_id) ?? { total: 0, passed: 0 };
      agg.total += 1;
      if (i.flag !== "SKIP" && i.status !== "dismissed") agg.passed += 1;
      byProject.set(i.project_id, agg);
    }
    for (const [pid, agg] of byProject) {
      if (agg.total >= 3) ideaPassRates.set(pid, agg.passed / agg.total);
    }
  }

  // Same "stalled video" definition as the project page's needs-attention.
  const needsAttention = allVideos.filter(
    (v) =>
      v.paused_reason &&
      !["KILLED", "APPROVED", "TRACKING", "FINAL_REVIEW", "ASSETS_READY"].includes(v.status),
  ).length;

  // UI v2 (Phase 6, D-15): the cross-project "awaiting you" row — per-project
  // counts of assets flagged 🟠 by the same tileState the Library tiles use.
  const awaiting = projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        count: (videosByProject.get(p.id) ?? []).filter((v) => tileState(v).awaitingYou)
          .length,
      }));

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher />
      <AwaitingYouRow projects={awaiting} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Studio <span className="gradient-text">Overview</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            All your channel projects at a glance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.publishedCount > 0 && (
            <a
              href="/api/export"
              className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
            >
              <Download className="size-4" /> Export CSV
            </a>
          )}
          <GenerateInsightsButton />
          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02]"
          >
            <Plus className="size-4" /> New Project
          </Link>
        </div>
      </div>

      <SystemPulse
        spendUsd={stats.monthlyCostUsd}
        budgetUsd={monthlyBudget}
        needsAttention={needsAttention}
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Rocket} label="Projects" value={String(stats.projectCount)} />
        <StatCard
          icon={Clapperboard}
          label="In pipeline"
          value={String(stats.inPipelineCount)}
        />
        <StatCard
          icon={Upload}
          label="Published"
          value={String(stats.publishedCount)}
        />
        <StatCard icon={Eye} label="Total views" value={compact(stats.totalViews)} />
        <StatCard
          icon={DollarSign}
          label="Est. revenue"
          value={`$${stats.estRevenueUsd.toFixed(2)}`}
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
              return (
                <ProjectCard
                  key={p.id}
                  project={p}
                  videoCount={vids.length}
                  inPipeline={inPipeline}
                  ideaPassRate={ideaPassRates.get(p.id) ?? null}
                />
              );
            })}
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
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02]"
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
          then redeploy.
        </p>
      </Card>
    </div>
  );
}
