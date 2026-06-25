"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { regenerateScriptAction } from "@/lib/actions/pipeline";

export function RegenerateScript({ projectId, videoId }: { projectId: string; videoId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const r = await regenerateScriptAction(projectId, videoId);
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Regenerate script
      </button>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  );
}
