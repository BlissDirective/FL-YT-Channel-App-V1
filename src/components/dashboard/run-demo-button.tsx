"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { runDemoPipelineAction } from "@/lib/actions/pipeline";

/** Queues a mock video at the IDEA gate — the Phase 3 validation entry point. */
export function RunDemoButton({ projectId }: { projectId: string }) {
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
            const r = await runDemoPipelineAction(projectId);
            if (!r.ok && r.error) setError(r.error);
            // Land where the result is: the new idea card in the queue.
            else router.push(`/projects/${projectId}/review`);
          })
        }
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Rocket className="size-4" />
        )}
        Run demo pipeline
      </button>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
