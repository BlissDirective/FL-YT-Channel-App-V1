import Link from "next/link";
import { notFound } from "next/navigation";
import { Rocket } from "lucide-react";
import {
  getBuildRuns,
  getIdeas,
  getKillSwitch,
  getOperatorEvents,
  getOperatorView,
  getProject,
} from "@/lib/db/queries";
import type { OperatorEvent } from "@/lib/db/types";
import { operatorReadiness } from "@/lib/pipeline/operator-readiness";
import { Card, CardTitle } from "@/components/ui/card";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { OperatorPanel } from "../operator-panel";
import { CalendarPanel } from "../calendar-panel";
import { BuildAndPost } from "../build/build-and-post";
import { BuildRunsPanel } from "../build/build-runs-panel";

export const dynamic = "force-dynamic";

/**
 * The merged Autopilot surface (UI v2 Phase 4, D-9/D-19): the operator's
 * calendar/cadence system IS the autonomy model; the old Build & Post batch
 * is demoted to a one-off "Boost" inside it. Backend operator_runs /
 * build_runs machinery untouched (D-10) — this page re-hosts the existing
 * panels and interleaves boost runs into the operator's activity timeline.
 */
export default async function AutopilotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [killSwitch, buildRuns, ideas, operator, operatorEvents] = await Promise.all([
    getKillSwitch(),
    getBuildRuns(id),
    getIdeas(id),
    getOperatorView(id),
    getOperatorEvents(id, 12),
  ]);
  const readiness = await operatorReadiness(project, {
    strategyPulled: Boolean(operator.run?.config?.strategy?.channel),
    killSwitch,
  });
  const ideaOptions = ideas
    .filter((i) => i.status !== "dismissed")
    .map((i) => ({ id: i.id, title: i.title, angle: i.angle }));

  // D-9: ONE activity timeline — boost (build) runs interleave with the
  // operator's own events, labeled as boost runs (D-19).
  const boostEvents: OperatorEvent[] = buildRuns.map((r) => ({
    id: `boost-${r.id}`,
    project_id: id,
    operator_run_id: null,
    kind: "boost",
    message: `Boost run — ${r.videos.length} video${r.videos.length === 1 ? "" : "s"} (${r.status})`,
    meta: {},
    created_at: r.createdAt,
  }));
  const timeline = [...operatorEvents, ...boostEvents]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 12);

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher tables={["operator_runs", "operator_events", "build_runs", "videos"]} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/" className="hover:text-ink">Projects</Link> /{" "}
          <Link href={`/projects/${id}/library`} className="hover:text-ink">
            {project.name}
          </Link>{" "}
          / Autopilot
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Autopilot</h1>
        <p className="mt-1 text-sm text-muted">
          The channel&apos;s autonomy system: daily cadence under a cycle budget,
          with a one-off Boost when you want assets expedited.
        </p>
      </div>

      <OperatorPanel
        projectId={id}
        view={operator}
        readiness={readiness}
        events={timeline}
      />

      {operator.status && <CalendarPanel projectId={id} calendar={operator.calendar} />}

      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Rocket className="size-4 text-accent" /> Boost — one-off batch
          </span>
        </CardTitle>
        <p className="text-sm text-muted">
          Build a batch of videos right now, outside the calendar — same gates,
          same budgets, same quality system. Runs appear in the timeline above
          as boost runs.
        </p>
        <div className="mt-3">
          <BuildAndPost projectId={id} ideas={ideaOptions} />
        </div>
      </Card>

      <BuildRunsPanel projectId={id} runs={buildRuns} />
    </div>
  );
}
