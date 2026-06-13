"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar } from "lucide-react";
import { runIntelligenceNowAction } from "@/lib/actions/intelligence";

/** "Run intelligence now" — scouts the niche and lands scored idea cards in
    the review queue (the daily run, on demand). */
export function RunIntelligenceButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const r = await runIntelligenceNowAction(projectId);
            if (!r.ok && r.error) setError(r.error);
            else router.push(`/projects/${projectId}/review`);
          })
        }
        className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
        Run intelligence
      </button>
      {error && <p className="max-w-48 text-right text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
