"use client";

import { useState, useTransition } from "react";
import { CalendarDays, RefreshCw, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { regenerateCalendarAction, skipCalendarSlotAction } from "@/lib/actions/operator";
import type { CalendarSlot } from "@/lib/db/types";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "coral" | "lavender"> = {
  planned: "neutral",
  seeded: "lavender",
  done: "success",
  skipped: "coral",
};

export function CalendarPanel({ projectId, calendar }: { projectId: string; calendar: CalendarSlot[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [open, setOpen] = useState(false);
  if (calendar.length === 0) return null;

  const slots = open ? calendar : calendar.filter((s) => s.status === "planned" || s.status === "seeded").slice(0, 8);
  const reserved = calendar.reduce((s, c) => s + (c.status === "skipped" ? 0 : Number(c.reservedUsd || 0)), 0);
  const longs = calendar.filter((s) => s.format === "long" && s.status !== "skipped").length;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-ink" />
          <CardTitle>Content calendar</CardTitle>
          <span className="text-xs text-muted">
            {calendar.length} days · {longs} long-form · ${reserved.toFixed(0)} reserved
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(undefined);
              const r = await regenerateCalendarAction(projectId);
              setMsg(r.ok ? "Re-planning the month…" : r.error ?? "Failed.");
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" /> Regenerate
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Planned upfront and adapts to performance. The operator produces 1/day from the next planned slot —
        skip or regenerate any time.
      </p>
      {msg && <p className="mt-1 text-xs font-medium text-ink">{msg}</p>}

      <ul className="mt-3 divide-y divide-line">
        {slots.map((s) => (
          <li key={s.day} className="flex items-center gap-2 py-2">
            <span className="w-9 shrink-0 text-[11px] font-semibold tabular-nums text-muted">D{s.day}</span>
            <span className="shrink-0">
              <StatusChip tone={s.format === "long" ? "warning" : "neutral"}>
                {s.format === "long" ? "long" : "short"}
              </StatusChip>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{s.title || s.subtopic || "(planning)"}</span>
              {s.title && <span className="block truncate text-[11px] text-muted">{s.subtopic}</span>}
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted">${Number(s.reservedUsd).toFixed(2)}</span>
            <StatusChip tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</StatusChip>
            {s.status === "planned" && (
              <button
                type="button"
                aria-label={`Skip day ${s.day}`}
                disabled={pending}
                onClick={() => start(async () => void (await skipCalendarSlotAction(projectId, s.day)))}
                className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {calendar.length > 8 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-xs font-medium text-muted hover:text-ink"
        >
          {open ? "Show less" : `Show all ${calendar.length} days`}
        </button>
      )}
    </Card>
  );
}
