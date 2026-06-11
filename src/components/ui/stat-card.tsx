import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusChip } from "./status-chip";

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  chip,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  /** e.g. "+12%" — rendered green for +, coral for - */
  delta?: string;
  chip?: { label: string; tone: "success" | "neutral" | "warning" };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 rounded-card bg-card p-5 shadow-card", className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-ink">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="flex items-baseline gap-1.5 text-2xl font-bold tabular-nums">
          {value}
          {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
          {delta && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                delta.startsWith("-")
                  ? "bg-coral/15 text-coral"
                  : "bg-success-soft text-success",
              )}
            >
              {delta}
            </span>
          )}
          {chip && <StatusChip tone={chip.tone}>{chip.label}</StatusChip>}
        </p>
      </div>
    </div>
  );
}
