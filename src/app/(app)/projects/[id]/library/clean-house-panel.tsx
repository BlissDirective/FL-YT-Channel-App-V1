"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Play, Pause, X, ShieldCheck } from "lucide-react";
import {
  approveCleanHouse,
  cancelCleanHouse,
  pauseCleanHouse,
  startCleanHouseTriage,
  tickCleanHouse,
} from "@/lib/actions/cleanhouse";
import { cn } from "@/lib/cn";

type Plan = { advance: number; flag: number; skip: number; estCostUsd: number };
type RunState = {
  run: { id: string; status: string; est_cost_usd: number; spent_usd: number; budget_ceiling_usd: number } | null;
  counts: { advance: number; flag: number; skip: number; ready: number; flagged: number; pending: number };
};

/**
 * Clean House control (admin-only). Triage → approve a plan + budget ceiling →
 * the run advances tick-by-tick, driving salvageable assets to Ready-to-publish
 * and flagging the unfixable. Never publishes, never auto-kills.
 */
export function CleanHousePanel({ projectId, active }: { projectId: string; active: RunState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState<{ runId: string; plan: Plan } | null>(null);
  const [ceiling, setCeiling] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const run = active.run;
  const c = active.counts;

  const triage = () =>
    start(async () => {
      setError(null);
      const res = await startCleanHouseTriage(projectId, "all");
      if (!res.ok || !res.result) { setError(res.error ?? "Failed"); return; }
      setPlan({ runId: res.result.runId, plan: res.result.plan });
      setCeiling(Math.max(5, Math.ceil(res.result.plan.estCostUsd)));
      router.refresh();
    });

  const approve = (runId: string) =>
    start(async () => {
      await approveCleanHouse(projectId, runId, ceiling);
      setPlan(null);
      router.refresh();
    });

  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  // ── Awaiting approval (triage plan ready) ────────────────────────────────
  const awaitingPlan = plan ?? (run?.status === "awaiting_approval" ? { runId: run.id, plan: { advance: c.advance, flag: c.flag, skip: c.skip, estCostUsd: run.est_cost_usd } } : null);

  return (
    <div className="space-y-3 rounded-card border border-accent/30 bg-gradient-to-br from-accent/[0.06] to-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-accent text-on-accent">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              Clean House
              <span className="inline-flex items-center gap-1 rounded-full bg-raised px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted">
                <ShieldCheck className="size-2.5" /> admin
              </span>
            </p>
            <p className="text-[11px] text-muted">Triage &amp; drive every asset to Ready — or flag the unfixable</p>
          </div>
        </div>
        {!run && !awaitingPlan && (
          <button
            type="button"
            onClick={triage}
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? "Triaging…" : "Triage library"}
          </button>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-coral">{error}</p>}

      {/* Plan → approve */}
      {awaitingPlan && (
        <div className="space-y-3 rounded-xl border border-line bg-card p-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tone="success" label={`${awaitingPlan.plan.advance} advance`} />
            <Chip tone="coral" label={`${awaitingPlan.plan.flag} flag`} />
            <Chip tone="muted" label={`${awaitingPlan.plan.skip} skip`} />
            <Chip tone="accent" label={`~$${awaitingPlan.plan.estCostUsd.toFixed(2)} est.`} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted">
              Budget ceiling
              <div className="mt-1 flex items-center gap-1">
                <span className="text-muted">$</span>
                <input
                  type="number"
                  min={0}
                  value={ceiling}
                  onChange={(e) => setCeiling(Number(e.target.value))}
                  className="input w-24"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => approve(awaitingPlan.runId)}
              disabled={pending}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-card hover:scale-[1.02] disabled:opacity-60"
            >
              <Play className="mr-1 inline size-3" /> Approve &amp; run
            </button>
            <button
              type="button"
              onClick={() => act(() => cancelCleanHouse(projectId, awaitingPlan.runId))}
              className="rounded-full bg-card-warm px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted">
            Approving authorizes autonomous execution for this run. It stops at
            Ready-to-publish — it never uploads and never kills.
          </p>
        </div>
      )}

      {/* Running / paused */}
      {run && (run.status === "running" || run.status === "paused") && (
        <div className="space-y-2 rounded-xl border border-line bg-card p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", run.status === "running" ? "bg-accent/15 text-accent" : "bg-raised text-muted")}>
              {run.status}
            </span>
            <Chip tone="success" label={`${c.ready} ready`} />
            <Chip tone="coral" label={`${c.flagged} flagged`} />
            <Chip tone="muted" label={`${c.pending} pending`} />
            <span className="ml-auto tabular-nums text-muted">${run.spent_usd.toFixed(2)} / ${run.budget_ceiling_usd.toFixed(2)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct(c)}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {run.status === "running" ? (
              <>
                <button type="button" onClick={() => act(() => tickCleanHouse(projectId, run.id))} disabled={pending} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:scale-[1.02] disabled:opacity-60">
                  {pending ? "Advancing…" : "Advance now"}
                </button>
                <button type="button" onClick={() => act(() => pauseCleanHouse(projectId, run.id))} className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink">
                  <Pause className="mr-1 inline size-3" /> Pause
                </button>
              </>
            ) : (
              <button type="button" onClick={() => act(() => tickCleanHouse(projectId, run.id))} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:scale-[1.02]">
                <Play className="mr-1 inline size-3" /> Resume
              </button>
            )}
            <button type="button" onClick={() => act(() => cancelCleanHouse(projectId, run.id))} className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted hover:text-coral">
              <X className="mr-1 inline size-3" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function pct(c: RunState["counts"]): number {
  const total = c.ready + c.flagged + c.skip + c.pending;
  if (total === 0) return 0;
  return Math.round(((c.ready + c.flagged + c.skip) / total) * 100);
}

function Chip({ label, tone }: { label: string; tone: "success" | "coral" | "accent" | "muted" }) {
  const cls = {
    success: "bg-success-soft text-success",
    coral: "bg-coral/15 text-coral",
    accent: "bg-accent/15 text-accent",
    muted: "bg-raised text-muted",
  }[tone];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>{label}</span>;
}
