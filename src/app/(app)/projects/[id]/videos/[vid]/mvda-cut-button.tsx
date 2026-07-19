"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { requestMvdaCutAction } from "@/lib/actions/pipeline";

/**
 * "Run MVDA cut" — the manual precision-edit counterpart to "Open editor" (spec
 * §C.3). Flags the video so the cut agent claims it and does an autonomous
 * precision pass the operator can then refine in the editor. Both modes.
 */
export function MvdaCutButton({ projectId, videoId }: { projectId: string; videoId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <button
      type="button"
      disabled={pending || done}
      title="Hand this cut to the MVDA agent for a precision pass"
      onClick={() =>
        start(async () => {
          setError(null);
          const r = await requestMvdaCutAction(projectId, videoId);
          if (r.ok) setDone(true);
          else setError(r.error ?? "Failed");
          router.refresh();
        })
      }
      className="flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-xs font-semibold shadow-card hover:bg-accent-soft disabled:opacity-60"
    >
      <Scissors className="size-3.5" />
      {done ? "Cut queued" : pending ? "Queuing…" : error ? "Retry cut" : "Run MVDA cut"}
    </button>
  );
}
