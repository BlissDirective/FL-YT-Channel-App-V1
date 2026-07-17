import Link from "next/link";
import { AlertCircle, Bot, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * One-line project signal strip for the Library header (UI v2 §4): THE
 * single place this project's spend-vs-budget, autopilot state, and
 * attention count live. Duplicated spend/attention cards elsewhere retire
 * in Phase 7.
 */
export function ProjectSignalStrip({
  spendUsd,
  budgetUsd,
  attentionCount,
  attentionHref,
  autopilot,
  className,
}: {
  spendUsd: number;
  budgetUsd?: number | null;
  attentionCount: number;
  /** Where the attention chip deep-links (e.g. `#awaiting`). */
  attentionHref?: string;
  autopilot?: "off" | "copilot" | "autopilot";
  className?: string;
}) {
  const overBudget = budgetUsd != null && budgetUsd > 0 && spendUsd >= budgetUsd;
  const attention = (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        attentionCount > 0 ? "bg-accent-soft text-ink" : "bg-card-warm text-muted",
      )}
    >
      <AlertCircle className="size-3.5" />
      {attentionCount > 0 ? `${attentionCount} awaiting you` : "Nothing waiting"}
    </span>
  );
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-card",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
          overBudget ? "bg-coral/15 text-coral" : "bg-card-warm text-ink",
        )}
      >
        <CircleDollarSign className="size-3.5" />
        ${spendUsd.toFixed(2)}
        {budgetUsd != null && budgetUsd > 0 && (
          <span className="text-muted"> / ${budgetUsd.toFixed(0)} mo</span>
        )}
      </span>
      {autopilot && autopilot !== "off" && (
        <span className="flex items-center gap-1.5 rounded-full bg-lavender/15 px-3 py-1 text-xs font-semibold text-lavender">
          <Bot className="size-3.5" /> {autopilot === "autopilot" ? "Autopilot" : "Co-pilot"}
        </span>
      )}
      {attentionHref ? <Link href={attentionHref}>{attention}</Link> : attention}
    </div>
  );
}
