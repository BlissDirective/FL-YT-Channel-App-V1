"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clapperboard, Loader2 } from "lucide-react";
import { approveGateAction } from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * Forward stage control at the Assets gate — the complement to the "Back to
 * script stage" card. Approving the assets advances the video to render
 * (ASSETS_READY → ASSEMBLING), which the render farm turns into the final cut
 * and stops at Final review. Full Auto videos auto-advance once their clips
 * land; this is the manual path (e.g. when you don't want to wait, or a clip
 * job stalled).
 */
export function AdvanceStage({
  projectId,
  videoId,
  pendingClips,
}: {
  projectId: string;
  videoId: string;
  /** Queued/running long-clip jobs still building for this video. */
  pendingClips: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const approve = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await approveGateAction(projectId, videoId);
      if (r.ok) router.refresh();
      else setError(r.error ?? "Couldn't advance.");
    });

  return (
    <Card className="border border-accent/40 bg-accent-soft/40">
      <CardTitle>
        <span className="flex items-center gap-2 text-ink">
          <Clapperboard className="size-4 text-accent" /> Ready to render?
        </span>
      </CardTitle>
      <p className="mt-2 text-sm text-muted">
        {pendingClips > 0
          ? `${pendingClips} AI clip${pendingClips === 1 ? "" : "s"} still building — this auto-advances to render when they land. You can render now with the assets that are ready, but pending clips won't be included.`
          : "Assets are ready. Approve to assemble the final cut and move to Final review, where you can download or publish."}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={approve}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {pendingClips > 0 ? "Render now" : "Approve assets → render"}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}
    </Card>
  );
}
