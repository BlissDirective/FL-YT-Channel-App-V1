"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { runDemoPipelineAction } from "@/lib/actions/pipeline";

/** Queues a mock video at the IDEA gate — the Phase 3 validation entry point.
    Lives in the project header's overflow menu, styled as a menu item. */
export function RunDemoButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="menuitem"
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
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Rocket className="size-4" />
        )}
        Run demo pipeline
      </button>
      {error && <p className="px-3 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
