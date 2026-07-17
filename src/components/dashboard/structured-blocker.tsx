import { AlertOctagon } from "lucide-react";
import type { StructuredBlocker } from "@studio/core";
import { cn } from "@/lib/cn";

/**
 * Structured blocker "your turn" card (B5 / #23). Renders a held video's
 * blocker as { what's blocked, what was tried, what's needed, actionable
 * options } instead of a vague pause line. Presentational — the caller wires
 * each option to its action. Dark/on-brand.
 */

const CATEGORY_TONE: Record<StructuredBlocker["category"], string> = {
  provider: "text-coral",
  budget: "text-accent",
  content: "text-sky",
  config: "text-lavender",
  quality: "text-accent",
  unknown: "text-muted",
};

export function StructuredBlockerCard({
  blocker,
  children,
}: {
  blocker: StructuredBlocker;
  /** Optional action buttons wired by the caller (fallback: static chips). */
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-card border border-coral/30 bg-coral/[0.05] p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-coral/15 text-coral">
          <AlertOctagon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", CATEGORY_TONE[blocker.category])}>
              {blocker.category}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted">needs your call</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-ink">{blocker.blocker}</p>
          <p className="mt-1 text-xs text-muted">
            <span className="font-semibold text-ink">Needs:</span> {blocker.needs}
          </p>
          {blocker.tried.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              <span className="font-semibold text-ink">Tried:</span> {blocker.tried.join(", ")}
            </p>
          )}
        </div>
      </div>
      {(children || blocker.options.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-coral/20 pt-3">
          {children ??
            blocker.options.map((o) => (
              <span
                key={o.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  o.id === blocker.recommendation
                    ? "bg-accent text-on-accent"
                    : "bg-card-warm text-ink",
                )}
              >
                {o.label}
                {o.id === blocker.recommendation && <span className="text-[9px] uppercase opacity-70">rec</span>}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
