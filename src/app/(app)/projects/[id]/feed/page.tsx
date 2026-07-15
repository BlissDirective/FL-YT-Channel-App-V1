import Link from "next/link";
import { notFound } from "next/navigation";
import { Radar } from "lucide-react";
import { getInsights, getProject, getVideoIntelList } from "@/lib/db/queries";
import { getFeedEntries } from "@/lib/db/feed";
import { getProjectTriage } from "@/lib/db/triage";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { FeedList, type IntelRow } from "./feed-list";
import { TriageList } from "./triage-list";

export const dynamic = "force-dynamic";

/**
 * The per-project Feed (UI v2 Phase 5, D-12/D-16): one filtered activity
 * stream — status changes, holds, autofix outcomes, operator/boost events —
 * with optimizer insights and intel scans as its actionable cards. Replaces
 * the global /insights destination for this project (Phase 7 retires it).
 */
export default async function FeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [entries, allInsights, intelRows, triage] = await Promise.all([
    getFeedEntries(id),
    getInsights(),
    getVideoIntelList({ projectId: id, limit: 10 }),
    getProjectTriage(id),
  ]);
  const insights = allInsights.filter((i) => i.project_id === id || i.project_id === null);
  const intel: IntelRow[] = intelRows.map((r) => ({
    id: r.id,
    topic: r.topic,
    status: r.status,
    depth: r.depth,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher
        tables={["videos", "operator_events", "insights", "video_intel", "autofix_runs", "build_runs"]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            <Link href="/" className="hover:text-ink">Projects</Link> /{" "}
            <Link href={`/projects/${id}/library`} className="hover:text-ink">
              {project.name}
            </Link>{" "}
            / Feed
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Feed</h1>
        </div>
        <Link
          href={`/intel?project=${id}`}
          className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
        >
          <Radar className="size-3.5" /> Intel workspace
        </Link>
      </div>

      {triage.needsYouCount > 0 && (
        <section className="space-y-3 rounded-card bg-accent-soft/40 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight">
              Needs you · {triage.needsYouCount}
            </h2>
            <span className="text-xs text-muted">
              Process assets without leaving the Feed
            </span>
          </div>
          <TriageList projectId={id} triage={triage} />
        </section>
      )}

      <FeedList projectId={id} entries={entries} insights={insights} intel={intel} />
    </div>
  );
}
