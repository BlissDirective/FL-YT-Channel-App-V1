"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Rocket, Square } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import {
  pauseOperatorAction,
  startOperatorAction,
  stopOperatorAction,
} from "@/lib/actions/operator";
import type { OperatorView } from "@/lib/db/queries";

const HOUR_LABEL = (h: number) => {
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${am ? "AM" : "PM"}`;
};
const TZ_ABBR = (tz: string) => (tz.includes("Chicago") ? "CT" : tz);

export function OperatorPanel({ projectId, view }: { projectId: string; view: OperatorView }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const running = view.status === "active";
  const paused = view.status === "paused";
  const live = running || paused;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      setMsg(undefined);
      const r = await fn();
      setMsg(r.ok ? ok : r.error ?? "Failed.");
    });

  const pct = view.budgetUsd > 0 ? Math.min(100, (view.spentUsd / view.budgetUsd) * 100) : 0;

  return (
    <Card className={live ? "border border-accent/40 bg-accent-soft/30" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-ink text-card">
            <Rocket className="size-4" />
          </span>
          <div>
            <CardTitle>Auto Pilot</CardTitle>
            <p className="text-xs text-muted">
              {running
                ? `Running · posts 1/day at ${HOUR_LABEL(view.postingHour)} ${TZ_ABBR(view.postingTz)}, holds for your approval`
                : paused
                  ? "Paused · budget clock still elapsing"
                  : "Autonomous channel operator — produces daily, holds for approval"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!live && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => startOperatorAction(projectId), "Auto Pilot started.")}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Play className="size-4" /> Start Auto Pipeline
            </button>
          )}
          {running && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => pauseOperatorAction(projectId), "Paused.")}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-canvas disabled:opacity-50"
            >
              <Pause className="size-4" /> Pause
            </button>
          )}
          {paused && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => startOperatorAction(projectId), "Resumed.")}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Play className="size-4" /> Resume
            </button>
          )}
          {live && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => stopOperatorAction(projectId), "Stopped.")}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral/10 disabled:opacity-50"
            >
              <Square className="size-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {live && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Status">
            <StatusChip tone={running ? "success" : "warning"}>{view.status}</StatusChip>
          </Stat>
          <Stat label="Cycle">
            <span className="text-sm font-semibold tabular-nums">
              Day {view.cycleDay}/{view.cycleDays}
            </span>
          </Stat>
          <Stat label="Spend">
            <span className="text-sm font-semibold tabular-nums">
              ${view.spentUsd.toFixed(2)} / ${view.budgetUsd.toFixed(0)}
            </span>
          </Stat>
          <Stat label="Today">
            <span className="text-sm font-semibold tabular-nums">
              {view.seededToday > 0 ? "seeded ✓" : "pending"}
            </span>
          </Stat>
        </div>
      )}

      {live && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
            <div
              className={`h-full rounded-full ${pct > 90 ? "bg-coral" : "bg-ink"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {view.videosThisCycle} video{view.videosThisCycle === 1 ? "" : "s"} this cycle ·
            ${view.remainingUsd.toFixed(2)} left
          </p>
        </div>
      )}

      {msg && <p className="mt-2 text-xs font-medium text-ink">{msg}</p>}
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
