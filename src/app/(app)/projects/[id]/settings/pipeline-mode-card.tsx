"use client";

import { useState, useTransition } from "react";
import { Bot, Clapperboard, Check, AlertTriangle } from "lucide-react";
import { setPipelineMode } from "@/lib/actions/projects";
import type { PipelineMode } from "@/lib/db/types";
import { cn } from "@/lib/cn";

/**
 * Pipeline Mode card (Director Mode spec §6.1). Two-option segmented control at
 * the top of Settings. Switching shows a confirm dialog spelling out the
 * freeze-in-place / re-arm semantics before the flip is applied.
 */
export function PipelineModeCard({
  projectId,
  mode: initialMode,
}: {
  projectId: string;
  mode: PipelineMode;
}) {
  const [mode, setMode] = useState<PipelineMode>(initialMode);
  const [confirming, setConfirming] = useState<PipelineMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function request(next: PipelineMode) {
    setError(null);
    if (next === mode) return;
    setConfirming(next);
  }

  function apply(next: PipelineMode) {
    startTransition(async () => {
      const res = await setPipelineMode(projectId, next);
      if (res.error) {
        setError(res.error);
        setConfirming(null);
        return;
      }
      setMode(next);
      setConfirming(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const OPTIONS: {
    value: PipelineMode;
    label: string;
    icon: typeof Bot;
    blurb: string;
  }[] = [
    {
      value: "autonomous",
      label: "Autonomous",
      icon: Bot,
      blurb:
        "The engine drives videos through the pipeline, auto-advancing gates per your per-gate autonomy settings, with sweeps and Auto Pilot running in the background.",
    },
    {
      value: "director",
      label: "Director",
      icon: Clapperboard,
      blurb:
        "You direct every stage. Nothing advances, revises, or publishes on its own — QC becomes advisory (it annotates, never blocks), and all background automation is off. Budget caps and the kill switch stay enforced.",
    },
  ];

  return (
    <div className="space-y-4 rounded-card bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Pipeline mode</h2>
          <p className="mt-0.5 text-xs text-muted">
            How this project moves work from idea to publish.
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-mode={mode}>
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => request(o.value)}
              disabled={pending}
              aria-pressed={active}
              data-pipeline-option={o.value}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-bg hover:border-accent/50",
                pending && "opacity-60",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4" /> {o.label}
                {active && (
                  <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Active
                  </span>
                )}
              </span>
              <span className="text-xs leading-relaxed text-muted">{o.blurb}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="flex items-start gap-1.5 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          target={confirming}
          pending={pending}
          onCancel={() => setConfirming(null)}
          onConfirm={() => apply(confirming)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  target,
  pending,
  onCancel,
  onConfirm,
}: {
  target: PipelineMode;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const toDirector = target === "director";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-card bg-card p-6 shadow-lg">
        <h3 className="text-base font-bold tracking-tight">
          Switch to {toDirector ? "Director" : "Autonomous"} mode?
        </h3>
        <div className="space-y-2 text-sm leading-relaxed text-muted">
          {toDirector ? (
            <>
              <p>
                Every video currently in flight <strong>freezes where it sits</strong> —
                no data changes. From now on the engine won&apos;t advance anything on its
                own; you drive each stage from the Director Console.
              </p>
              <p>
                Background automation (Auto Pilot, auto-fix sweeps, self-watch,
                scheduled publishing) stops for this project. Budget caps and the kill
                switch stay in force.
              </p>
              <p className="text-xs">
                Auto Pilot must be stopped first, or the switch is blocked.
              </p>
            </>
          ) : (
            <>
              <p>
                The engine takes back over. Any video parked mid-stage is{" "}
                <strong>re-armed</strong> and resumes automatically; videos waiting at a
                gate resume your saved per-gate autonomy settings.
              </p>
              <p>
                Sweeps, Auto Pilot, and scheduled publishing become available again.
              </p>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {pending ? "Switching…" : `Switch to ${toDirector ? "Director" : "Autonomous"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
