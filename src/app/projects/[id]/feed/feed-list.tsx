"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Radar, Sparkles } from "lucide-react";
import type { FeedEntry } from "@/lib/db/feed";
import type { InsightWithProject } from "@/lib/db/queries";
import { runOptimizerNowAction } from "@/lib/actions/intelligence";
import { InsightCard } from "@/app/insights/insights-list";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";

export type IntelRow = {
  id: string;
  topic: string;
  status: string;
  depth: string;
  created_at: string;
};

type StreamItem =
  | { kind: "entry"; at: string; entry: FeedEntry }
  | { kind: "insight"; at: string; insight: InsightWithProject }
  | { kind: "intel"; at: string; intel: IntelRow };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Needs action", value: "needs-action" },
  { label: "Insights", value: "insight" },
  { label: "Intel", value: "intel" },
  { label: "System", value: "system" },
];

/**
 * The per-project Feed stream (UI v2 Phase 5, D-16): one filtered timeline
 * of system events + actionable agent cards. Insight Apply/Dismiss reuse the
 * existing InsightCard (canary semantics preserved); intel rows deep-link to
 * the summonable Intel workspace.
 */
export function FeedList({
  projectId,
  entries,
  insights,
  intel,
}: {
  projectId: string;
  entries: FeedEntry[];
  insights: InsightWithProject[];
  intel: IntelRow[];
}) {
  const [filter, setFilter] = useState("all");

  const stream: StreamItem[] = [
    ...entries.map((entry) => ({ kind: "entry" as const, at: entry.at, entry })),
    ...insights.map((insight) => ({ kind: "insight" as const, at: insight.created_at, insight })),
    ...intel.map((row) => ({ kind: "intel" as const, at: row.created_at, intel: row })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .filter((item) => {
      if (filter === "all") return true;
      if (filter === "insight") return item.kind === "insight";
      if (filter === "intel") return item.kind === "intel";
      if (item.kind !== "entry") return false;
      return item.entry.category === filter;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PillTabs size="sm" ariaLabel="Feed filter" options={FILTERS} value={filter} onChange={setFilter} />
        <GenerateProjectInsights projectId={projectId} />
      </div>

      {stream.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Nothing here yet under this filter — activity, insights, and intel
            scans for this project will stream in as the studio works.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {stream.map((item) =>
          item.kind === "insight" ? (
            <InsightCard key={`insight-${item.insight.id}`} insight={item.insight} />
          ) : item.kind === "intel" ? (
            <Link
              key={`intel-${item.intel.id}`}
              href={`/intel?project=${projectId}`}
              className="group flex items-center justify-between gap-3 rounded-card bg-card p-4 shadow-card transition-shadow hover:shadow-float"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-lavender/15 text-lavender">
                  <Radar className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    Intel scan: {item.intel.topic}
                  </p>
                  <p className="text-xs text-muted">
                    {item.intel.depth} · {item.intel.status} · {fmtAgo(item.at)}
                  </p>
                </div>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <FeedRow key={item.entry.id} entry={item.entry} />
          ),
        )}
      </div>
    </div>
  );
}

function FeedRow({ entry }: { entry: FeedEntry }) {
  const body = (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-card bg-card p-3.5 shadow-card",
        entry.category === "needs-action" && "ring-1 ring-accent/50",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        {entry.detail && <p className="mt-0.5 text-xs text-coral">{entry.detail}</p>}
      </div>
      <span className="flex shrink-0 items-center gap-2">
        {entry.category === "needs-action" && (
          <StatusChip tone="warning">your turn</StatusChip>
        )}
        <span className="text-xs tabular-nums text-muted">{fmtAgo(entry.at)}</span>
      </span>
    </div>
  );
  return entry.href ? (
    <Link href={entry.href} className="block transition-transform hover:scale-[1.005]">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Per-project optimizer trigger — the Feed's "Generate insights". */
function GenerateProjectInsights({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const r = await runOptimizerNowAction(projectId);
            if (!r.ok && r.error) setError(r.error);
            else router.refresh();
          })
        }
        className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        Generate insights
      </button>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

function fmtAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
