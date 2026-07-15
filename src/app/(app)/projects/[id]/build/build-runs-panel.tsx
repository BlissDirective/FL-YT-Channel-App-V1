"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pause, Play, Rocket, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import type { BuildRunRow, BuildRunVideo } from "@/lib/db/queries";
import {
  cancelBuildRunAction,
  pauseBuildRunAction,
  resumeBuildRunAction,
  runBuildNowAction,
} from "@/lib/actions/build";

const RUN_TONE: Record<string, "success" | "neutral" | "warning" | "coral" | "lavender"> = {
  done: "success",
  publishing: "lavender",
  scheduled: "lavender",
  generating: "warning",
  planning: "neutral",
  held: "coral",
  paused: "neutral",
  cancelled: "coral",
};

function fmtSlot(iso: string | null): string {
  if (!iso) return "ASAP";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function videoStageTone(v: BuildRunVideo): "success" | "neutral" | "warning" | "coral" {
  if (v.status === "KILLED") return "coral";
  if (v.pausedReason && !["APPROVED", "TRACKING", "FINAL_REVIEW"].includes(v.status)) return "coral";
  if (v.status === "TRACKING" || v.youtubeVideoId) return "success";
  if (v.status === "APPROVED") return "success";
  return "neutral";
}

export function BuildRunsPanel({
  projectId,
  runs,
}: {
  projectId: string;
  runs: BuildRunRow[];
}) {
  if (runs.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Rocket className="size-4 text-ink" />
        <CardTitle>Build &amp; Post runs</CardTitle>
      </div>
      <div className="mt-3 space-y-4">
        {runs.map((r) => (
          <RunBlock key={r.id} projectId={projectId} run={r} />
        ))}
      </div>
    </Card>
  );
}

function RunBlock({ projectId, run }: { projectId: string; run: BuildRunRow }) {
  const [isPending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [runMsg, setRunMsg] = useState<string>();
  const active = !["done", "cancelled"].includes(run.status);
  const hasPending = run.videos.some(
    (v) => !v.youtubeVideoId && !["TRACKING", "KILLED", "APPROVED"].includes(v.status),
  );
  const posted = run.videos.filter((v) => v.youtubeVideoId || v.status === "TRACKING").length;

  const act = (fn: () => Promise<unknown>) => start(async () => void (await fn()));

  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={RUN_TONE[run.status] ?? "neutral"}>{run.status}</StatusChip>
          <span className="text-sm font-semibold">
            {run.count} × {run.kind}
          </span>
          <span className="text-xs text-muted">
            {run.tier} · {run.scheduleMode.replace(/_/g, " ")} · {posted}/{run.count} posted
          </span>
          <span className="text-xs tabular-nums text-muted">
            ${run.actualUsd.toFixed(2)} / ~${run.estCostUsd.toFixed(2)} est
          </span>
        </div>
        {active && (
          <div className="flex items-center gap-1">
            {run.status !== "paused" && hasPending && (
              <IconBtn
                label="Run now"
                disabled={isPending}
                onClick={() =>
                  start(async () => {
                    setRunMsg(undefined);
                    const r = await runBuildNowAction(projectId);
                    setRunMsg(
                      r.ok
                        ? `Drove ${r.processed} video${r.processed === 1 ? "" : "s"}${r.held ? `, ${r.held} held` : ""}${r.errors ? `, ${r.errors} error${r.errors === 1 ? "" : "s"}` : ""}.`
                        : r.error ?? "Run failed.",
                    );
                  })
                }
              >
                <Rocket className="size-3.5" /> Run now
              </IconBtn>
            )}
            {run.status === "paused" ? (
              <IconBtn
                label="Resume"
                disabled={isPending}
                onClick={() => act(() => resumeBuildRunAction(projectId, run.id))}
              >
                <Play className="size-3.5" /> Resume
              </IconBtn>
            ) : (
              <IconBtn
                label="Pause"
                disabled={isPending}
                onClick={() => act(() => pauseBuildRunAction(projectId, run.id))}
              >
                <Pause className="size-3.5" /> Pause
              </IconBtn>
            )}
            {confirmCancel ? (
              <IconBtn
                label="Confirm cancel"
                tone="coral"
                disabled={isPending}
                onClick={() => act(() => cancelBuildRunAction(projectId, run.id))}
              >
                <X className="size-3.5" /> Confirm
              </IconBtn>
            ) : (
              <IconBtn label="Cancel" tone="coral" onClick={() => setConfirmCancel(true)}>
                <X className="size-3.5" /> Cancel
              </IconBtn>
            )}
          </div>
        )}
      </div>
      {runMsg && <p className="mt-1 text-xs font-medium text-ink">{runMsg}</p>}

      <ul className="mt-2 divide-y divide-line">
        {run.videos.map((v) => (
          <li key={v.id}>
            <Link
              href={`/projects/${projectId}/videos/${v.id}`}
              className="-mx-1 flex items-center justify-between gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-canvas"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{v.title}</span>
              {(v.youtubeVideoId || v.status === "TRACKING") && v.views != null && (
                <span className="text-[11px] tabular-nums text-muted">
                  {Intl.NumberFormat("en", { notation: "compact" }).format(v.views)} views
                </span>
              )}
              {v.qcScore != null && (
                <span className="text-[11px] tabular-nums text-muted">QC {v.qcScore.toFixed(1)}</span>
              )}
              {v.publishPrivacy && (
                <span className="text-[11px] capitalize text-muted">{v.publishPrivacy}</span>
              )}
              <span className="text-[11px] tabular-nums text-muted">{fmtSlot(v.scheduledPublishAt)}</span>
              <StatusChip tone={videoStageTone(v)}>
                {(v.youtubeVideoId ? "posted" : v.status).replace(/_/g, " ").toLowerCase()}
              </StatusChip>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  tone,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "coral";
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
        tone === "coral"
          ? "text-coral hover:bg-coral/10"
          : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
