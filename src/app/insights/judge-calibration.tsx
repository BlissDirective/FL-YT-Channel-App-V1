import { Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * Judge-calibration report (Harness C1). Reads the operator's agree/disagree
 * labels (judge_labels) and shows per-gate agreement plus the criteria most
 * disputed — the concrete "rewrite this rubric line next" signal. Renders
 * nothing until labels exist; nags gently below ~50 labels (the point where
 * agreement numbers start meaning something).
 */

const MEANINGFUL_LABELS = 50;

export async function JudgeCalibration() {
  const supabase = await createClient();
  const { data: labels } = await supabase
    .from("judge_labels")
    .select("gate, agree, criterion_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (labels ?? []) as { gate: string; agree: boolean; criterion_id: string | null }[];
  if (rows.length === 0) return null;

  const byGate = new Map<string, { total: number; agreed: number }>();
  const disputes = new Map<string, number>();
  for (const l of rows) {
    const g = byGate.get(l.gate) ?? { total: 0, agreed: 0 };
    g.total += 1;
    if (l.agree) g.agreed += 1;
    byGate.set(l.gate, g);
    if (!l.agree && l.criterion_id) {
      disputes.set(l.criterion_id, (disputes.get(l.criterion_id) ?? 0) + 1);
    }
  }
  const worst = [...disputes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-ink">
          <Scale className="size-4" />
        </span>
        <CardTitle>Judge calibration</CardTitle>
        <span className="ml-auto text-xs text-muted">
          {rows.length} label{rows.length === 1 ? "" : "s"}
          {rows.length < MEANINGFUL_LABELS ? ` · ${MEANINGFUL_LABELS - rows.length} more to a solid read` : ""}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {[...byGate.entries()].map(([gate, g]) => {
          const pct = Math.round((g.agreed / g.total) * 100);
          return (
            <div key={gate}>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  pct >= 80 ? "text-success" : pct >= 60 ? "text-ink" : "text-coral",
                )}
              >
                {pct}%
              </p>
              <p className="text-xs text-muted">
                {gate} agreement ({g.total})
              </p>
            </div>
          );
        })}
      </div>
      {worst.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Most disputed criteria:{" "}
          {worst.map(([id, n]) => `${id} (×${n})`).join(", ")} — candidates for a
          rubric rewrite in <span className="font-medium text-ink">src/lib/pipeline/rubrics.ts</span>.
        </p>
      )}
    </Card>
  );
}
