import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";

export type AwaitingProject = {
  projectId: string;
  projectName: string;
  /** Videos waiting at a gate or visibly paused. */
  count: number;
};

/**
 * The cross-project "awaiting you" row on Home (UI v2 Phase 6, D-15): the
 * 5-second morning check. Each chip deep-links into that project's Library,
 * where the flagged tiles carry the quick actions.
 */
export function AwaitingYouRow({ projects }: { projects: AwaitingProject[] }) {
  const waiting = projects.filter((p) => p.count > 0);
  if (waiting.length === 0) return null;
  return (
    <div
      data-testid="awaiting-you-row"
      className="flex flex-wrap items-center gap-2 rounded-card bg-card p-3 shadow-card"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <AlertCircle className="size-3.5 text-accent" /> Awaiting you
      </span>
      {waiting.map((p) => (
        <Link
          key={p.projectId}
          href={`/projects/${p.projectId}/library`}
          className="group flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent"
        >
          {p.projectName}
          <span className="rounded-full bg-card px-1.5 py-0.5 tabular-nums">
            {p.count}
          </span>
          <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}
