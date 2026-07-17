import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type RailStep = { key: string; label: string; gate?: boolean };

/**
 * The Asset Canvas progress rail (UI v2, D-6): one horizontal strip showing
 * where an asset is in its whole life. Gate checkpoints render as rings —
 * the places the pipeline waits for a decision. Purely presentational.
 */
export function ProgressRail({
  steps,
  current,
  className,
}: {
  steps: readonly RailStep[];
  /** 0-based index of the step the asset is at; steps before it are done. */
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-center gap-1 overflow-x-auto", className)} aria-label="Pipeline progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1 last:flex-none">
            <span className="flex flex-col items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors",
                  done && "bg-raised text-accent",
                  active && "bg-accent text-on-accent ring-2 ring-accent/40",
                  !done && !active && "bg-card-warm text-muted",
                  step.gate && !done && !active && "ring-1 ring-line",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium leading-none",
                  active ? "text-ink" : "text-muted",
                )}
              >
                {step.label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn("mb-4 h-0.5 min-w-2 flex-1 rounded-full", done ? "bg-raised" : "bg-line")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact segmented progress bar for library tiles (D-5): one segment per
    rail step, filled through the asset's current step. */
export function StageProgressBar({
  total,
  current,
  className,
}: {
  total: number;
  current: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full gap-0.5", className)} role="progressbar" aria-valuemin={0} aria-valuemax={total - 1} aria-valuenow={Math.max(0, current)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < current ? "bg-raised" : i === current ? "bg-accent" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
