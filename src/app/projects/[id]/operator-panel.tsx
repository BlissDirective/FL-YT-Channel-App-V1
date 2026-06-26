"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Minus, Pause, Play, Rocket, Square } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import {
  pauseOperatorAction,
  startOperatorAction,
  stopOperatorAction,
} from "@/lib/actions/operator";
import type { OperatorView } from "@/lib/db/queries";
import type { Readiness } from "@/lib/pipeline/operator-readiness";
import type { OperatorEvent } from "@/lib/db/types";

const HOUR_LABEL = (h: number) => {
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${am ? "AM" : "PM"}`;
};
const TZ_ABBR = (tz: string) => (tz.includes("Chicago") ? "CT" : tz);

const EVENT_ICON: Record<string, string> = {
  seed: "🌱",
  notify: "📨",
  hold: "⚠️",
  approve: "✅",
  auto_approve: "🤖",
  skip: "⏭",
  analytics: "📈",
  digest: "📊",
  cycle_roll: "🔄",
  budget: "💸",
  error: "❌",
  start: "▶️",
  pause: "⏸",
  stop: "⏹",
};

function fmtAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function OperatorPanel({
  projectId,
  view,
  readiness,
  events,
}: {
  projectId: string;
  view: OperatorView;
  readiness: Readiness;
  events: OperatorEvent[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const running = view.status === "active";
  const paused = view.status === "paused";
  const live = running || paused;
  const blocker = readiness.checks.find((c) => c.status === "fail");

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

      {live && view.hasAnalytics && (
        <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-canvas/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monetization · YPP</p>
            <span className="text-[11px] text-muted">
              {Math.round(view.mixShortsPct * 100)}% shorts · {view.mixReason}
            </span>
          </div>
          <Goal label="Subscribers" value={view.subs} goal={view.subsGoal} fmt={compact} />
          <Goal label="Watch-hours · 365d" value={view.watchHours} goal={view.watchGoal} fmt={(n) => n.toFixed(0)} highlight={view.nearerPath === "watch"} />
          {view.shortsViews > 0 && (
            <Goal label="Shorts views · 90d" value={view.shortsViews} goal={view.shortsGoal} fmt={compact} highlight={view.nearerPath === "shorts"} />
          )}
          {(view.retentionPct > 0 || view.dailyCap > 0) && (
            <p className="text-[11px] text-muted">
              {view.retentionPct > 0 ? `Avg retention ${view.retentionPct.toFixed(0)}% · ` : ""}cadence {view.dailyCap}/day
            </p>
          )}
        </div>
      )}

      {blocker && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <b>Not ready:</b> {blocker.label} — {blocker.detail}
          </span>
        </div>
      )}

      {/* Go-live checklist before launch; collapses to events once running. */}
      {!live && (
        <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-canvas/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Go-live checklist</p>
          {readiness.checks.map((c) => (
            <div key={c.key} className="flex items-start gap-2 text-sm">
              {c.status === "ok" ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
              ) : c.status === "warn" ? (
                <Minus className="mt-0.5 size-4 shrink-0 text-muted" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" />
              )}
              <span>
                <span className="font-medium text-ink">{c.label}</span>
                <span className="text-muted"> — {c.detail}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {live && events.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Recent activity</p>
          <ul className="space-y-1">
            {events.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted">{EVENT_ICON[e.kind] ?? "•"} </span>
                  {e.message}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{fmtAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
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

const compact = (n: number) => Intl.NumberFormat("en", { notation: "compact" }).format(n);

function Goal({
  label,
  value,
  goal,
  fmt,
  highlight,
}: {
  label: string;
  value: number;
  goal: number;
  fmt: (n: number) => string;
  highlight?: boolean;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={highlight ? "font-semibold text-ink" : "text-muted"}>
          {label}
          {highlight ? " · nearer path" : ""}
        </span>
        <span className="tabular-nums text-muted">
          {fmt(value)} / {fmt(goal)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-card">
        <div className={`h-full rounded-full ${highlight ? "bg-accent" : "bg-ink/60"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
