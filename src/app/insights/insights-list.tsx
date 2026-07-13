"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { insightIsApplicable } from "@/lib/insights-kinds";
import {
  applyInsightAction,
  dismissInsightAction,
  runAllOptimizerAction,
} from "@/lib/actions/intelligence";
import type { InsightWithProject } from "@/lib/db/queries";

export function GenerateInsightsButton() {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<string>();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setNote(undefined);
            const r = await runAllOptimizerAction();
            if (!r.ok) setNote(r.error);
          })
        }
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
        Generate insights
      </button>
      {note && <p className="max-w-56 text-right text-xs font-medium text-coral">{note}</p>}
    </div>
  );
}

export function InsightCard({ insight }: { insight: InsightWithProject }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [showDiff, setShowDiff] = useState(false);
  const applied = insight.status === "applied";
  const hasTemplate = Boolean(insight.proposed_template_kind && insight.proposed_template_body);
  // Only "script" templates are actually read by generation today — apply on any
  // other proposed kind is advisory (a "Mark done" acknowledgement), never a
  // dead template write.
  const applicable = insightIsApplicable(insight.proposed_template_kind, insight.proposed_template_body);
  const metric = (insight.evidence as { metric?: string })?.metric;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok) setError(r.error);
    });

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-2xl bg-accent-soft text-ink">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {insight.projectName}
            </p>
            <h3 className="font-semibold leading-snug">{insight.title}</h3>
          </div>
        </div>
        {applied && <StatusChip tone="success">Applied</StatusChip>}
      </div>

      <p className="text-sm leading-relaxed text-ink/90">{insight.body}</p>

      <div className="flex flex-wrap items-center gap-2">
        {metric && <StatusChip tone="neutral">{metric}</StatusChip>}
        {hasTemplate && (
          <StatusChip tone="lavender">
            proposes a {insight.proposed_template_kind} template change
            {!applicable && " (advisory)"}
          </StatusChip>
        )}
        {applied && insight.applied_template_version != null && (
          <StatusChip tone="neutral">→ template v{insight.applied_template_version}</StatusChip>
        )}
      </div>

      {hasTemplate && (
        <div>
          <button
            type="button"
            onClick={() => setShowDiff((s) => !s)}
            className="text-xs font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2"
          >
            {showDiff ? "Hide proposed template" : "Preview proposed template"}
          </button>
          {showDiff && (
            <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-canvas px-3 py-2 font-sans text-xs leading-relaxed text-muted">
              {insight.proposed_template_body}
            </pre>
          )}
        </div>
      )}

      {error && <p className="text-sm font-medium text-coral">{error}</p>}

      {!applied && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => act(() => applyInsightAction(insight.id))}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {applicable ? "Apply suggestion" : "Mark done"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => act(() => dismissInsightAction(insight.id))}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-50"
          >
            <X className="size-4" /> Dismiss
          </button>
        </div>
      )}
    </Card>
  );
}
