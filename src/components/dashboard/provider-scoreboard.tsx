"use client";

import { useMemo, useState } from "react";
import { Cpu, Trophy } from "lucide-react";
import {
  scoreProviders,
  SCORE_DIMENSIONS,
  type ScoreDimension,
} from "@studio/core";
import { tierCandidates } from "@/lib/adapters/provider-candidates";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import { cn } from "@/lib/cn";

/**
 * Provider selection scoreboard (#1) — a live, interactive window into the
 * 7-dimension model selector. For the chosen tier + shot role it runs the SAME
 * pure `scoreProviders` the pipeline uses and shows the ranked models, their
 * per-dimension scores, and why the winner wins. Baseline priors are shown
 * here; live provider health (outages, recent error rates) is folded in at
 * generation time. Purely client-side — no spend, no server round-trip.
 */

const DIM_LABEL: Record<ScoreDimension, string> = {
  taskFit: "Fit",
  quality: "Quality",
  control: "Control",
  reliability: "Reliability",
  cost: "Cost",
  latency: "Latency",
  continuity: "Continuity",
};

/** Distinct 3–4 char tick labels (Control/Continuity mustn't collide). */
const DIM_TICK: Record<ScoreDimension, string> = {
  taskFit: "Fit",
  quality: "Qual",
  control: "Ctrl",
  reliability: "Rely",
  cost: "Cost",
  latency: "Spd",
  continuity: "Flow",
};

const TIERS: { id: AutoTier; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "premium", label: "Premium" },
  { id: "platinum", label: "Platinum" },
];

export function ProviderScoreboard({ defaultTier = "premium" }: { defaultTier?: AutoTier }) {
  const [tier, setTier] = useState<AutoTier>(defaultTier);
  const [shot, setShot] = useState<"hero" | "broll">("hero");

  const decision = useMemo(() => {
    const candidates = tierCandidates(tier);
    return scoreProviders(candidates, {
      shot,
      targetSec: shot === "hero" ? 8 : 6,
      needsAudio: shot === "hero",
      budgetRemainingUsd: 100,
    });
  }, [tier, shot]);

  const rows = decision ? [decision.winner, ...decision.alternatives] : [];

  return (
    <div className="space-y-4 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
            <Cpu className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Model selection</p>
            <p className="text-[11px] text-muted">7-dimension score · per beat</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Segmented
            value={shot}
            onChange={(v) => setShot(v as "hero" | "broll")}
            options={[
              { id: "hero", label: "Hero" },
              { id: "broll", label: "B-roll" },
            ]}
          />
        </div>
      </div>

      <Segmented
        value={tier}
        onChange={(v) => setTier(v as AutoTier)}
        options={TIERS.map((t) => ({ id: t.id, label: t.label }))}
        full
      />

      {decision && (
        <p className="rounded-xl bg-accent/[0.07] px-3 py-2 text-xs leading-relaxed text-ink">
          <Trophy className="mr-1 inline size-3.5 -translate-y-px text-accent" />
          {decision.rationale}
        </p>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              i === 0 ? "border-accent/40 bg-accent/[0.06]" : "border-line bg-card-warm",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {i === 0 && <Trophy className="size-3.5 shrink-0 text-accent" />}
                <span className="truncate text-sm font-semibold">{r.label}</span>
                {!r.affordable && (
                  <span className="rounded-full bg-coral/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-coral">
                    over budget
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="tabular-nums text-muted">${r.estCostUsd.toFixed(2)}</span>
                <span className="tabular-nums font-bold text-accent">
                  {Math.round(r.total * 100)}
                </span>
              </div>
            </div>
            {/* 7-dimension mini-bars */}
            <div className="mt-2 grid grid-cols-7 gap-1">
              {SCORE_DIMENSIONS.map((d) => (
                <div key={d} className="flex flex-col items-center gap-1" title={`${DIM_LABEL[d]}: ${Math.round(r.dims[d] * 100)}`}>
                  <div className="flex h-9 w-full items-end overflow-hidden rounded bg-raised">
                    <div
                      className={cn("w-full rounded-sm", i === 0 ? "bg-accent" : "bg-sky/60")}
                      style={{ height: `${Math.max(6, Math.round(r.dims[d] * 100))}%` }}
                    />
                  </div>
                  <span className="text-[8px] uppercase tracking-tight text-muted">
                    {DIM_TICK[d]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
  full = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  full?: boolean;
}) {
  return (
    <div className={cn("flex items-center rounded-full bg-raised p-0.5", full && "w-full")}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            full && "flex-1",
            value === o.id ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
