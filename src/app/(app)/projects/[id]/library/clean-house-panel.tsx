"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Play, Pause, X, ShieldCheck, ListChecks, AlertTriangle, RotateCcw } from "lucide-react";
import {
  planWithinBudget,
  rankForBudget,
  type CleanHouseBudgetStrategy,
} from "@studio/core";
import {
  approveCleanHouse,
  cancelCleanHouse,
  pauseCleanHouse,
  startCleanHouseTriage,
  tickCleanHouse,
} from "@/lib/actions/cleanhouse";
import { cn } from "@/lib/cn";
import { StarBorder } from "@/components/ui/star-border";

type Plan = { advance: number; flag: number; skip: number; estCostUsd: number };
type AdvanceItem = { salvageability: number; estCostUsd: number; qcScore: number | null };
type Candidate = { id: string; title: string; status: string };
type RunState = {
  run: { id: string; status: string; est_cost_usd: number; spent_usd: number; committed_usd: number; budget_ceiling_usd: number; paused_reason: string | null; budget_strategy: string | null } | null;
  counts: { advance: number; flag: number; skip: number; ready: number; flagged: number; pending: number };
};

const STRATEGIES: { key: CleanHouseBudgetStrategy; label: string; hint: string }[] = [
  { key: "salvageability", label: "Best odds", hint: "highest salvageability first" },
  { key: "cheapest", label: "Most wins", hint: "cheapest to fix first" },
  { key: "closest-to-floor", label: "Least lift", hint: "closest to the floor first" },
];

/**
 * Clean House control (admin-only). Triage → approve a plan + budget ceiling →
 * the run advances tick-by-tick, driving salvageable assets to Ready-to-publish
 * and flagging the unfixable. Never publishes, never auto-kills.
 */
export function CleanHousePanel({
  projectId,
  active,
  candidates = [],
}: {
  projectId: string;
  active: RunState;
  candidates?: Candidate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState<{ runId: string; plan: Plan; advanceItems: AdvanceItem[]; qcFloor: number } | null>(null);
  const [ceiling, setCeiling] = useState(20);
  const [strategy, setStrategy] = useState<CleanHouseBudgetStrategy>("salvageability");
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const run = active.run;
  const c = active.counts;

  const runTriage = (mode: "all" | "selected", ids: string[] = []) =>
    start(async () => {
      setError(null);
      const res = await startCleanHouseTriage(projectId, mode, ids);
      if (!res.ok || !res.result) { setError(res.error ?? "Failed"); return; }
      setPlan({ runId: res.result.runId, plan: res.result.plan, advanceItems: res.result.advanceItems, qcFloor: res.result.qcFloor });
      setCeiling(Math.max(5, Math.ceil(res.result.plan.estCostUsd)));
      setPicking(false);
      setSelected(new Set());
      router.refresh();
    });

  // Discard the current triage plan (or run) and reopen the picker (Part B).
  const reselect = (runId: string) =>
    start(async () => {
      await cancelCleanHouse(projectId, runId);
      setPlan(null);
      setPicking(true);
      router.refresh();
    });

  const triage = () => runTriage("all");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const allSelected = candidates.length > 0 && selected.size === candidates.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(candidates.map((v) => v.id)));

  const approve = (runId: string) =>
    start(async () => {
      await approveCleanHouse(projectId, runId, ceiling, [], strategy);
      setPlan(null);
      router.refresh();
    });

  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  // ── Awaiting approval (triage plan ready) ────────────────────────────────
  const awaitingPlan =
    plan ??
    (run?.status === "awaiting_approval"
      ? { runId: run.id, plan: { advance: c.advance, flag: c.flag, skip: c.skip, estCostUsd: run.est_cost_usd }, advanceItems: [] as AdvanceItem[] }
      : null);

  // Budget frontier: how many advance-items fit under the ceiling in the chosen
  // strategy order (Part A). Only meaningful for a fresh triage this session
  // (we have the per-item list); a prior-session plan hides it.
  const frontier = useMemo(() => {
    if (!plan || plan.advanceItems.length === 0) return null;
    const ranked = rankForBudget(
      plan.advanceItems.map((i) => ({ ...i, qcFloor: plan.qcFloor })),
      strategy,
    );
    return planWithinBudget(ranked, ceiling);
  }, [plan, strategy, ceiling]);

  return (
    <StarBorder color="var(--color-accent)" speed="7s" className="block w-full">
      <div className="glass glass-shine space-y-3 rounded-card border border-accent/25 bg-gradient-to-br from-accent/[0.05] to-card/60 p-4 shadow-card">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPicking((p) => !p)}
              disabled={pending || candidates.length === 0}
              className="rounded-full bg-card-warm px-3 py-2 text-xs font-semibold text-muted shadow-card transition-colors hover:text-ink disabled:opacity-60"
            >
              <ListChecks className="mr-1 inline size-3" /> {picking ? "Cancel" : "Select assets"}
            </button>
            <button
              type="button"
              onClick={triage}
              disabled={pending}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {pending ? "Triaging…" : "Triage library"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-coral">{error}</p>}

      {run?.status === "paused" && run.paused_reason && (
        <p className="flex items-start gap-1.5 rounded-xl bg-coral/10 px-3 py-2 text-xs font-semibold text-coral">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Auto-paused — {run.paused_reason}
        </p>
      )}

      {/* Subset picker → triage a chosen set */}
      {!run && !awaitingPlan && picking && (
        <div className="space-y-2 rounded-xl border border-line bg-card p-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={toggleAll} className="text-[11px] font-semibold text-accent hover:underline">
              {allSelected ? "Clear all" : "Select all"}
            </button>
            <span className="text-[11px] text-muted">{selected.size} of {candidates.length} selected</span>
          </div>
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {candidates.map((v) => (
              <li key={v.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-raised">
                  <input
                    type="checkbox"
                    checked={selected.has(v.id)}
                    onChange={() => toggle(v.id)}
                    className="size-3.5 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{v.title}</span>
                  <span className="shrink-0 rounded-full bg-raised px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted">{v.status}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => runTriage("selected", [...selected])}
            disabled={pending || selected.size === 0}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-card hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? "Triaging…" : `Triage ${selected.size} selected`}
          </button>
        </div>
      )}

      {/* Plan → approve */}
      {awaitingPlan && (
        <div className="space-y-3 rounded-xl border border-line bg-card p-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tone="success" label={`${awaitingPlan.plan.advance} advance`} />
            <Chip tone="coral" label={`${awaitingPlan.plan.flag} flag`} />
            <Chip tone="muted" label={`${awaitingPlan.plan.skip} skip`} />
            <Chip tone="accent" label={`~$${awaitingPlan.plan.estCostUsd.toFixed(2)} est.`} />
          </div>

          {/* Budget strategy — which assets a capped budget funds first */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Budget strategy</p>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStrategy(s.key)}
                  title={s.hint}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    strategy === s.key
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-line bg-card-warm text-muted hover:text-ink",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
              onClick={() => reselect(awaitingPlan.runId)}
              disabled={pending}
              className="rounded-full bg-card-warm px-4 py-2 text-xs font-semibold text-muted hover:text-ink disabled:opacity-60"
            >
              <RotateCcw className="mr-1 inline size-3" /> Re-select assets
            </button>
          </div>

          {/* Budget frontier — how much of the plan the ceiling actually funds */}
          {frontier && ceiling > 0 && (
            <p className="text-[11px] text-muted">
              Under ${ceiling.toFixed(0)}: funds{" "}
              <span className="font-semibold text-ink">
                {frontier.funded.length} of {awaitingPlan.plan.advance}
              </span>{" "}
              advanceable assets (~${frontier.fundedCostUsd.toFixed(2)}).
              {frontier.deferred.length > 0 && (
                <> {frontier.deferred.length} wait until you raise the ceiling &amp; resume.</>
              )}
            </p>
          )}
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
            <span
              className="ml-auto tabular-nums text-muted"
              title="Real dollars booked to the cost ledger · estimate committed against the ceiling"
            >
              <span className="font-semibold text-ink">${run.spent_usd.toFixed(2)}</span> spent
              <span className="text-muted/70"> · ${run.committed_usd.toFixed(2)} committed</span> / ${run.budget_ceiling_usd.toFixed(2)}
            </span>
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
            <button
              type="button"
              onClick={() => {
                if (window.confirm("End this run and start a new selection? Assets already in flight finish on their own; queued ones are dropped.")) {
                  reselect(run.id);
                }
              }}
              disabled={pending}
              className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink disabled:opacity-60"
            >
              <RotateCcw className="mr-1 inline size-3" /> Re-select
            </button>
            <button type="button" onClick={() => act(() => cancelCleanHouse(projectId, run.id))} className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted hover:text-coral">
              <X className="mr-1 inline size-3" /> Cancel
            </button>
          </div>
        </div>
      )}
      </div>
    </StarBorder>
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
