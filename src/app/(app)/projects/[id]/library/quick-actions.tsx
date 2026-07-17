"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play, RefreshCw, X } from "lucide-react";
import {
  approveGateAction,
  killVideoAction,
  nudgeStalledVideoAction,
  requestRevisionAction,
  resetRenderAttemptsAction,
  resumeVideoAction,
} from "@/lib/actions/pipeline";
import {
  dismissIdeaCardAction,
  queueIdeaCardAction,
} from "@/lib/actions/intelligence";

/**
 * Library tile quick actions (UI v2 Phase 2, D-5): approve / request changes
 * / kill straight from the grid — the SAME server actions the review queue
 * calls (§3.1 contract), so gate semantics (QC, revision caps, autonomy) are
 * identical. Errors surface inline; success refreshes the grid so the tile
 * moves sections.
 */

type Result = { ok: boolean; error?: string; warning?: string };

function useAct() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  const act = (fn: () => Promise<Result>) =>
    startTransition(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok && r.error) setError(r.error);
      else router.refresh();
    });
  return { isPending, error, act };
}

const btn = {
  approve:
    "flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.03] disabled:opacity-50",
  soft: "flex items-center gap-1 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-50",
  danger:
    "flex items-center gap-1 rounded-full bg-coral/10 px-3 py-1.5 text-xs font-semibold text-coral transition-colors hover:bg-coral/20 disabled:opacity-50",
};

/** Approve / request-changes / kill for a video waiting at a gate. */
export function GateQuickActions({
  projectId,
  videoId,
}: {
  projectId: string;
  videoId: string;
}) {
  const { isPending, error, act } = useAct();
  const [revising, setRevising] = useState(false);
  const [notes, setNotes] = useState("");

  if (revising) {
    return (
      <div className="w-full space-y-1.5">
        <textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What should change?"
          rows={2}
          className="w-full rounded-xl border border-line bg-canvas px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isPending || !notes.trim()}
            onClick={() =>
              act(async () => {
                const r = await requestRevisionAction(projectId, videoId, notes);
                if (r.ok) {
                  setRevising(false);
                  setNotes("");
                }
                return r;
              })
            }
            className={btn.approve}
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Send
          </button>
          <button type="button" onClick={() => setRevising(false)} className={btn.soft}>
            Cancel
          </button>
        </div>
        {error && <p className="text-xs font-medium text-coral">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => act(() => approveGateAction(projectId, videoId))}
        className={btn.approve}
        title="Approve this checkpoint and continue"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setRevising(true)}
        className={btn.soft}
      >
        <RefreshCw className="size-3" /> Changes
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (window.confirm("Kill this video? It drops out of the pipeline (audited).")) {
            act(() => killVideoAction(projectId, videoId));
          }
        }}
        className={btn.danger}
      >
        <X className="size-3" /> Kill
      </button>
      {error && <p className="w-full text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

/** Resume a paused / stalled video from its tile. Render-failed videos get
    "Reset & retry" instead (clears the ×3 attempt counter, re-queues the
    render) — re-homed from the retired needs-attention panel. */
export function ResumeQuickAction({
  projectId,
  videoId,
  renderFailed,
}: {
  projectId: string;
  videoId: string;
  renderFailed?: boolean;
}) {
  const { isPending, error, act } = useAct();
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          act(() =>
            renderFailed
              ? resetRenderAttemptsAction(projectId, videoId)
              : resumeVideoAction(projectId, videoId),
          )
        }
        className={btn.approve}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
        {renderFailed ? "Reset & retry" : "Resume"}
      </button>
      {error && <p className="w-full text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

/** Nudge a silently-stalled video (worker cron hasn't run) — re-dispatches the
    render/clip/agent workflow so it's picked up promptly. */
export function NudgeQuickAction({
  projectId,
  videoId,
}: {
  projectId: string;
  videoId: string;
}) {
  const { isPending, error, act } = useAct();
  const [done, setDone] = useState(false);
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={isPending || done}
        onClick={() =>
          act(async () => {
            const r = await nudgeStalledVideoAction(projectId, videoId);
            if (r.ok) setDone(true);
            return r;
          })
        }
        className={btn.approve}
        title="Re-trigger the worker that should be processing this video"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {done ? "Nudged" : "Nudge worker"}
      </button>
      {error && <p className="w-full text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

/** Queue / dismiss an un-promoted intelligence idea card (D-18). */
export function IdeaCardActions({
  projectId,
  ideaId,
}: {
  projectId: string;
  ideaId: string;
}) {
  const { isPending, error, act } = useAct();
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => act(() => queueIdeaCardAction(projectId, ideaId))}
        className={btn.approve}
        title="Start a video from this idea (lands at the Idea checkpoint)"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Queue
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => act(() => dismissIdeaCardAction(projectId, ideaId))}
        className={btn.danger}
      >
        <X className="size-3" /> Dismiss
      </button>
      {error && <p className="w-full text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
