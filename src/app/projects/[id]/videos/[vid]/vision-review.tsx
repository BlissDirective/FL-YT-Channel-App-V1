import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import type { FrameCritique } from "@/lib/stick-types";

const SEVERITY_TONE: Record<string, "warning" | "coral" | "neutral"> = {
  high: "coral",
  med: "warning",
  low: "neutral",
};

/** Tier-1 vision critique of the rendered keyframes (see Vision Optimizer Loop). */
export function VisionReview({ review }: { review: FrameCritique }) {
  const score = Number(review.score ?? 0);
  const scores = review.scores ?? { readability: 0, composition: 0, captions: 0, consistency: 0 };
  const strengths = review.strengths ?? [];
  const issues = review.issues ?? [];
  const tone = score >= 8 ? "success" : score >= 6 ? "warning" : "coral";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-lavender/15 text-lavender">
          <Eye className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Vision review</h2>
          <p className="text-xs text-muted">
            Claude watched the rendered keyframes and scored the animation.
            {review.provider === "mock" && " (mock — set ANTHROPIC_API_KEY on the render farm to enable)"}
          </p>
        </div>
      </div>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={tone}>{score.toFixed(1)}/10 overall</StatusChip>
          {Object.entries(scores).map(([k, v]) => (
            <span key={k} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold capitalize text-muted">
              {k} {v.toFixed(0)}
            </span>
          ))}
        </div>

        {strengths.length > 0 && (
          <ul className="space-y-1 text-sm text-ink/90">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-success">+</span>
                {s}
              </li>
            ))}
          </ul>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {issues.length} issue{issues.length === 1 ? "" : "s"} — edit the beat below or re-roll it
            </p>
            <ul className="space-y-2">
              {issues.map((iss, i) => (
                <li key={i} className="rounded-xl bg-canvas px-3 py-2">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {iss.beatIdx != null && (
                      <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-ink">
                        Beat {iss.beatIdx + 1}
                      </span>
                    )}
                    <StatusChip tone={SEVERITY_TONE[iss.severity] ?? "neutral"}>{iss.severity}</StatusChip>
                    <span className="text-[11px] capitalize text-muted">{iss.category}</span>
                  </div>
                  <p className="text-sm text-ink/90">{iss.note}</p>
                  {iss.fix && <p className="mt-0.5 text-xs text-muted">→ {iss.fix}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
