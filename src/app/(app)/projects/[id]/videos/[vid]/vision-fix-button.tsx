"use client";

import { useState, useTransition } from "react";
import { Loader2, Wand2, ScanEye } from "lucide-react";
import { fixFromVisionReviewAction, reReviewVisionAction } from "@/lib/actions/autofix";

/**
 * Vision-review actions. Two operator controls on the card:
 *
 *  • "Fix these issues" — hands the critique to the fix agent, which re-rolls
 *    the flagged VISUAL beats (and enables/tightens captions) and RE-RENDERS.
 *    The re-render runs on the GitHub Actions render farm, so it's ASYNC —
 *    the message says so, and the rendered result (plus a fresh vision score)
 *    lands after the farm finishes. It does not touch highlights or SFX.
 *
 *  • "Re-review" — runs the in-app Self-Watch judge for an INSTANT second
 *    opinion (timing, script-match, transitions, competitive fit) with no
 *    render-farm dependency. The farm's rendered-frame critique still refreshes
 *    on the next render.
 */
export function VisionFixButton({ projectId, videoId }: { projectId: string; videoId: string }) {
  const [pending, startT] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [reReview, setReReview] = useState<{
    overall: number;
    dimensions: { label: string; score: number }[];
    issues: string[];
  } | null>(null);

  const runFix = () =>
    startT(async () => {
      setMsg(null);
      const r = await fixFromVisionReviewAction(projectId, videoId);
      if (!r.ok) {
        setMsg({ tone: "err", text: r.error ?? "Fix failed." });
        return;
      }
      if (r.kind === "fixed") {
        setMsg({
          tone: "ok",
          text: `Fix applied (was ${r.score?.toFixed(1)}/10). It's re-rendering on the render farm — this runs in the background and takes a few minutes. The updated cut and a fresh score land automatically when it finishes.`,
        });
      } else if (r.kind === "done") {
        setMsg({ tone: "ok", text: `Cut accepted at ${r.score?.toFixed(1)}/10 — nothing more to fix.` });
      } else if (r.kind === "held") {
        setMsg({ tone: "ok", text: `Held for manual review (${r.score?.toFixed(1)}/10).` });
      } else if (r.reason === "awaiting-rerender") {
        setMsg({ tone: "ok", text: "A re-render is already in progress on the farm — check back shortly." });
      } else if (r.reason === "awaiting-critique") {
        setMsg({ tone: "ok", text: "Waiting on a fresh render critique — try again in a moment." });
      } else if (r.reason === "not-at-final-review") {
        setMsg({ tone: "err", text: "The fix agent runs once the video reaches Final Review." });
      } else {
        setMsg({ tone: "ok", text: `No action taken${r.reason ? ` (${r.reason})` : ""}.` });
      }
    });

  const runReReview = () =>
    startT(async () => {
      setMsg(null);
      setReReview(null);
      const r = await reReviewVisionAction(projectId, videoId);
      if (!r.ok) {
        setMsg({ tone: "err", text: r.error ?? "Re-review failed." });
        return;
      }
      setReReview({ overall: r.overall ?? 0, dimensions: r.dimensions ?? [], issues: r.issues ?? [] });
    });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={runReReview}
          disabled={pending}
          title="Run the in-app Self-Watch judge now for an instant second opinion (no render farm needed)"
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-card transition-opacity hover:bg-accent-soft disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ScanEye className="size-3.5" />}
          Re-review
        </button>
        <button
          type="button"
          onClick={runFix}
          disabled={pending}
          title="Send these issues to the fix agent — it re-rolls the flagged visual beats and re-renders on the farm (async)"
          className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
          {pending ? "Working…" : "Fix these issues"}
        </button>
      </div>

      {msg && (
        <p className={`max-w-xs text-right text-xs font-medium ${msg.tone === "err" ? "text-coral" : "text-muted"}`}>
          {msg.text}
        </p>
      )}

      {reReview && (
        <div className="w-full max-w-xs space-y-1 rounded-xl bg-canvas p-3 text-left text-xs">
          <p className="font-semibold text-ink">
            Self-Watch re-review: {reReview.overall.toFixed(1)}/10
          </p>
          <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted">
            {reReview.dimensions.map((d) => (
              <span key={d.label}>
                {d.label} {d.score.toFixed(0)}
              </span>
            ))}
          </p>
          {reReview.issues.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-muted">
              {reReview.issues.slice(0, 4).map((iss, i) => (
                <li key={i}>• {iss}</li>
              ))}
            </ul>
          )}
          <p className="pt-1 text-[11px] italic text-muted">
            The rendered-frame critique refreshes automatically after the next render.
          </p>
        </div>
      )}
    </div>
  );
}
