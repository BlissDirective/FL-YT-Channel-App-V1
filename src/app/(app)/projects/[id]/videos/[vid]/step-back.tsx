"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerUpLeft, Loader2, Undo2 } from "lucide-react";
import { stepBackStageAction } from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * "Step back a stage" control. Shown on a video that's in (or past) asset
 * generation so the operator can return it to the script-approval gate after a
 * change of mind — to edit/remix the script or re-run Full Auto-Generate.
 *
 * Stepping back cancels any in-flight clip jobs; the operator chooses whether
 * to discard the already-generated assets or keep them (VO is cached either
 * way, so unchanged narration re-voices free).
 */
export function StepBackStage({
  projectId,
  videoId,
  backToLabel,
}: {
  projectId: string;
  videoId: string;
  /** Human name of the stage this steps back to, e.g. "script". */
  backToLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const stepBack = (deleteAssets: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const r = await stepBackStageAction(projectId, videoId, deleteAssets);
      if (r.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(r.error ?? "Couldn't step back.");
      }
    });
  };

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <Undo2 className="size-4 text-muted" /> Change of plan?
        </span>
      </CardTitle>

      {!confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Move this video back to the {backToLabel} stage to edit or remix the
            script, or re-run Full Auto-Generate. Any in-progress clip jobs are
            cancelled.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 rounded-full bg-card-warm px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <CornerUpLeft className="size-4" /> Back to {backToLabel} stage
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-card border border-coral/40 bg-coral/5 p-3">
          <p className="text-sm font-medium text-ink">
            Send this video back to the {backToLabel} stage?
          </p>
          <p className="text-xs text-muted">
            What should happen to the assets already generated (clips, stills,
            voiceover, thumbnails)? Voiceover stays cached either way, so
            unchanged narration re-voices for free.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => stepBack(true)}
              className="flex items-center gap-1.5 rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CornerUpLeft className="size-4" />}
              Discard assets &amp; go back
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => stepBack(false)}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CornerUpLeft className="size-4" />}
              Keep assets &amp; go back
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-2.5 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs font-medium text-coral">{error}</p>}
        </div>
      )}
    </Card>
  );
}
