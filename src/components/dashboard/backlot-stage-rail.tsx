import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  FileText,
  Film,
  Lightbulb,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { BacklotStage } from "@/lib/db/pipeline";
import { cn } from "@/lib/cn";

const STAGE_ICON: Record<string, LucideIcon> = {
  ideas: Lightbulb,
  script: FileText,
  assets: Film,
  render: Clapperboard,
  ready: Rocket,
};

/**
 * The Backlot production board's stage rail (#8): the five pipeline lanes as
 * illuminated nodes. A lane with an agent actively working PULSES (`.stage-live`
 * amber glow) and shows a live spinner; a lane with videos waiting on you shows
 * an amber "your turn" pip; connectors carry a travelling energy spark between
 * lit lanes. Purely presentational — all stats are computed server-side by
 * `backlotStages()`.
 */
export function BacklotStageRail({
  stages,
  projectId,
}: {
  stages: BacklotStage[];
  projectId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex w-max min-w-full items-stretch gap-0 pt-3">
        {stages.map((stage, i) => {
          const Icon = STAGE_ICON[stage.key] ?? Film;
          const live = stage.active > 0;
          const awaiting = stage.awaiting > 0;
          const empty = stage.total === 0;
          const nextLive = i < stages.length - 1 && stages[i + 1]?.active > 0;
          return (
            <div key={stage.key} className="flex flex-1 items-center">
              <Link
                href={`/projects/${projectId}/feed?stage=${stage.key}`}
                aria-label={`${stage.label}: ${stage.total} in lane`}
                className={cn(
                  "group relative flex min-w-[8.5rem] flex-1 flex-col gap-2 rounded-card border p-4 transition-all",
                  live
                    ? "stage-live border-accent/40 bg-accent/[0.07]"
                    : awaiting
                      ? "border-accent/40 bg-card"
                      : empty
                        ? "border-line bg-card/50"
                        : "border-line bg-card hover:border-accent/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-xl transition-colors",
                      live
                        ? "bg-accent text-on-accent"
                        : empty
                          ? "bg-raised text-muted"
                          : "bg-accent/12 text-accent",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-bold tabular-nums tracking-tight",
                      empty ? "text-muted/50" : "text-ink",
                    )}
                  >
                    {stage.total}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wide",
                      live ? "text-accent" : "text-muted",
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                {/* Live / your-turn status line */}
                <div className="flex min-h-4 flex-wrap items-center gap-1.5">
                  {live && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
                      <span className="size-1.5 rounded-full bg-accent live-dot" />
                      {stage.active} working
                    </span>
                  )}
                  {awaiting && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      {stage.awaiting} your turn
                    </span>
                  )}
                </div>
              </Link>

              {/* Connector with a travelling spark when the next lane is live */}
              {i < stages.length - 1 && (
                <div className="relative mx-1 hidden h-px w-6 shrink-0 items-center sm:flex">
                  <span className="h-px w-full bg-line" />
                  <ArrowRight
                    className={cn(
                      "absolute left-1/2 size-3 -translate-x-1/2",
                      nextLive ? "text-accent" : "text-muted/40",
                    )}
                  />
                  {nextLive && (
                    <span
                      className="flow-spark absolute left-0 size-1.5 rounded-full bg-accent shadow-[0_0_6px_1px_rgb(245_184_41/0.8)]"
                      style={{ ["--spark-dist" as string]: "24px" }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
