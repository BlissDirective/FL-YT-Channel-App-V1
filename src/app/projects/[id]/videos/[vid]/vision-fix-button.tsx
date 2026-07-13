"use client";

import { useState, useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { fixFromVisionReviewAction } from "@/lib/actions/autofix";

/**
 * "Fix these issues" — one tap on the Vision review card triggers the fix
 * agent (the auto-fix loop's engine) to read this critique's per-beat issues,
 * adjust the flagged beats, and re-render. Available even when the channel's
 * auto-fix loop is off; bounded by the kill switch + budget caps server-side.
 */
export function VisionFixButton({ projectId, videoId }: { projectId: string; videoId: string }) {
  const [pending, startT] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const run = () =>
    startT(async () => {
      setMsg(null);
      const r = await fixFromVisionReviewAction(projectId, videoId);
      if (!r.ok) {
        setMsg({ tone: "err", text: r.error ?? "Fix failed." });
        return;
      }
      if (r.kind === "fixed") {
        setMsg({ tone: "ok", text: `Applied a fix (was ${r.score?.toFixed(1)}/10) — re-rendering. Check back shortly.` });
      } else if (r.kind === "done") {
        setMsg({ tone: "ok", text: `Cut accepted at ${r.score?.toFixed(1)}/10 — nothing more to fix.` });
      } else if (r.kind === "held") {
        setMsg({ tone: "ok", text: `Held for manual review (${r.score?.toFixed(1)}/10).` });
      } else if (r.reason === "awaiting-critique") {
        setMsg({ tone: "ok", text: "Waiting on a fresh render critique — try again in a moment." });
      } else if (r.reason === "awaiting-rerender") {
        setMsg({ tone: "ok", text: "A re-render is already in progress — check back shortly." });
      } else {
        setMsg({ tone: "ok", text: "No further action needed." });
      }
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="Send these issues to the fix agent — it adjusts the flagged beats and re-renders"
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
        {pending ? "Fixing…" : "Fix these issues"}
      </button>
      {msg && (
        <p className={`text-xs font-medium ${msg.tone === "err" ? "text-coral" : "text-muted"}`}>{msg.text}</p>
      )}
    </div>
  );
}
