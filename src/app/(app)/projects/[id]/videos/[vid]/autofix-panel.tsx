"use client";

import { useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { runAutofixNowAction, setVideoAutofixAction } from "@/lib/actions/autofix";
import type { AutofixLoop, AutofixState } from "@/lib/db/types";

const LOOP_LABEL: Record<Exclude<AutofixLoop, "off">, string> = {
  animation: "Animation loop",
  aiclip: "AI image / clip loop",
};

const STATUS_TONE: Record<string, "success" | "warning" | "coral" | "neutral" | "lavender"> = {
  done: "success",
  rerendering: "lavender",
  held: "coral",
  idle: "neutral",
};

export function AutofixPanel({
  projectId,
  videoId,
  loop,
  projectEnabled,
  override,
  config,
  state,
}: {
  projectId: string;
  videoId: string;
  /** Channel-level strategy ('off' hides this panel upstream). */
  loop: Exclude<AutofixLoop, "off">;
  projectEnabled: boolean;
  /** Per-asset override: null = inherit, true/false = forced. */
  override: boolean | null;
  config: { threshold: number; maxRenders: number; spendCapUsd: number };
  state: AutofixState;
}) {
  const [pending, startT] = useTransition();
  const [msg, setMsg] = useState<string>();
  const effectiveOn = override ?? projectEnabled;
  const mode: "inherit" | "on" | "off" = override == null ? "inherit" : override ? "on" : "off";
  const status = state.status ?? "idle";
  const attempts = state.attempts ?? 0;
  const history = state.history ?? [];

  const setMode = (m: "inherit" | "on" | "off") =>
    startT(async () => {
      setMsg(undefined);
      await setVideoAutofixAction(projectId, videoId, m);
    });

  const runNow = () =>
    startT(async () => {
      setMsg(undefined);
      const r = await runAutofixNowAction(projectId, videoId);
      if (!r.ok) setMsg(r.error ?? "Run failed.");
      else if (r.kind === "fixed") setMsg(`Applied a fix (was ${r.score?.toFixed(1)}/10) — re-rendering.`);
      else if (r.kind === "done") setMsg(`Passed at ${r.score?.toFixed(1)}/10 — nothing to fix.`);
      else if (r.kind === "held") setMsg(`Held for manual review (${r.score?.toFixed(1)}/10).`);
      else setMsg(reasonLabel(r.reason));
    });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wand2 className="size-4 text-lavender" />
          <CardTitle>Auto-fix</CardTitle>
          <span className="text-xs text-muted">{LOOP_LABEL[loop]}</span>
          <StatusChip tone={STATUS_TONE[status] ?? "neutral"}>{status}</StatusChip>
          {attempts > 0 && (
            <span className="text-[11px] tabular-nums text-muted">
              {attempts}/{config.maxRenders} re-renders
              {state.bestScore != null && ` · best ${Number(state.bestScore).toFixed(1)}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "inherit" | "on" | "off")}
            className="input h-8 py-0 text-xs"
            aria-label="Auto-fix for this asset"
          >
            <option value="inherit">Inherit ({projectEnabled ? "on" : "off"})</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
          <button
            type="button"
            onClick={runNow}
            disabled={pending || !effectiveOn}
            className="inline-flex items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Wand2 className="size-3.5" /> {pending ? "Running…" : "Run now"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        Below {config.threshold}/10 triggers a fix; up to {config.maxRenders} re-renders,
        then holds for review. Spend cap ${config.spendCapUsd.toFixed(2)}/video. Fixes are
        remembered per channel.
      </p>
      {msg && <p className="mt-1 text-xs font-medium text-ink">{msg}</p>}

      {history.length > 0 && (
        <ul className="mt-3 space-y-2">
          {[...history].reverse().map((h) => (
            <li key={h.attempt} className="rounded-xl bg-canvas px-3 py-2 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-ink">
                  Attempt {h.attempt}
                </span>
                <span className="text-[11px] tabular-nums text-muted">
                  {h.fromScore.toFixed(1)}
                  {h.toScore != null ? ` → ${h.toScore.toFixed(1)}` : " → …"}
                </span>
              </div>
              <ul className="space-y-0.5 text-ink/90">
                {h.changes.map((c, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-lavender">›</span>
                    {c}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function reasonLabel(reason?: string): string {
  switch (reason) {
    case "awaiting-critique":
      return "Waiting on the render farm's vision critique.";
    case "awaiting-rerender":
      return "Re-render in progress — check back shortly.";
    case "not-at-final-review":
      return "Only runs once the video reaches Final Review.";
    case "disabled":
      return "Auto-fix is off for this asset.";
    case "done":
      return "Already passed — nothing to fix.";
    case "held":
      return "Held for manual review.";
    default:
      return "No action taken.";
  }
}
