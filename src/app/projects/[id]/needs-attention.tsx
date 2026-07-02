"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Loader2, RotateCcw } from "lucide-react";
import { resetRenderAttemptsAction, resumeVideoAction } from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";

export type PausedVideo = {
  id: string;
  title: string;
  status: string;
  reason: string;
};

/**
 * Project "needs attention" panel — replaces the old header chip that dumped a
 * full render error inline. Lists each paused/failed video with a short reason
 * and per-row actions (Open / Retry), so a failure is something you act on
 * rather than a wall of red text.
 */
export function NeedsAttention({
  projectId,
  videos,
}: {
  projectId: string;
  videos: PausedVideo[];
}) {
  if (videos.length === 0) return null;
  return (
    <div id="needs-attention" className="scroll-mt-4">
    <Card className="border border-coral/40 bg-coral/5">
      <CardTitle>
        <span className="flex items-center gap-2 text-ink">
          <AlertTriangle className="size-4 text-coral" /> Needs attention
          <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">
            {videos.length}
          </span>
        </span>
      </CardTitle>
      <div className="mt-2 space-y-2">
        {videos.map((v) => (
          <PausedRow key={v.id} projectId={projectId} video={v} />
        ))}
      </div>
    </Card>
    </div>
  );
}

function PausedRow({ projectId, video }: { projectId: string; video: PausedVideo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  // The render farm caps attempts and writes e.g. "Render failed (attempt
  // 3/3): …" — once exhausted, the fix is to reset attempts, not re-run the
  // in-process pipeline.
  const renderFail = video.reason.match(/^Render failed \(attempt (\d+)\/(\d+)\)/);
  const renderExhausted =
    renderFail !== null && Number(renderFail[1]) >= Number(renderFail[2]);

  const retry = () =>
    startTransition(async () => {
      setError(undefined);
      const r = renderExhausted
        ? await resetRenderAttemptsAction(projectId, video.id)
        : await resumeVideoAction(projectId, video.id);
      if (r.ok) router.refresh();
      else setError(r.error ?? "Retry failed.");
    });

  return (
    <div className="rounded-card bg-card p-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{video.title}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {video.status.replace(/_/g, " ").toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={retry}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            {renderExhausted ? "Retry render" : "Retry"}
          </button>
          <Link
            href={`/projects/${projectId}/videos/${video.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-soft"
          >
            Open <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{video.reason}</p>
      {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
