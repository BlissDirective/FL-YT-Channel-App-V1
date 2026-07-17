"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, X } from "lucide-react";
import { killVideoAction, resumeVideoAction } from "@/lib/actions/pipeline";

/**
 * Asset Canvas header controls (UI v2 Phase 3, D-6): resume when paused,
 * kill from any status — one consistent place, same server actions as
 * everywhere else. Step-back stays its own card (it is stage-specific).
 */
export function CanvasControls({
  projectId,
  videoId,
  paused,
  killed,
}: {
  projectId: string;
  videoId: string;
  paused: boolean;
  killed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (killed) return null;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok && r.error) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="flex items-center gap-2">
      {paused && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => act(() => resumeVideoAction(projectId, videoId))}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent shadow-card disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          Resume
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (window.confirm("Kill this video? It drops out of the pipeline (audited).")) {
            act(
              () => killVideoAction(projectId, videoId),
              () => router.push(`/projects/${projectId}/library`),
            );
          }
        }}
        className="flex items-center gap-1.5 rounded-full bg-coral/10 px-3.5 py-2 text-xs font-semibold text-coral transition-colors hover:bg-coral/20 disabled:opacity-50"
      >
        <X className="size-3.5" /> Kill
      </button>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
