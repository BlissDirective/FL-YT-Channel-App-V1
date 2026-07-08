"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveQualityGatesAction, type QualityGates } from "@/lib/actions/pipeline";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export const QUALITY_GATE_DEFAULTS: Required<QualityGates> = {
  ideaFloor: 6,
  revisionWarnAt: 3,
  revisionHardCap: 4,
  qcLessonBelow: 7,
  coldStartMin: 5,
  seedVisionFloor: 6,
  varietyMinDistance: 6,
  autofixThreshold: 7,
  runFloor: 7,
  runPublic: 8,
  factRiskMax: 7,
  beatRelevanceFloor: 6,
  timingFloor: 7,
  watchBlockPublishBelow: 5,
  competitiveFloor: 6,
  transitionFloor: 6,
  watchTemporalEscalateAt: 2,
  playbookShadowMinEvidence: 5,
  playbookAutoGraduateConfidence: 0.8,
};

type GateKey = keyof QualityGates;

const FIELDS: { key: GateKey; label: string; hint: string; min: number; max: number; step?: number }[] = [
  { key: "ideaFloor", label: "Idea score floor", hint: "Ideas the judge scores below this are auto-dismissed", min: 0, max: 10, step: 0.5 },
  { key: "revisionWarnAt", label: "Revision warn at", hint: "Revision round that starts warning you (before the hard cap)", min: 1, max: 10 },
  { key: "revisionHardCap", label: "Revision hard cap", hint: "Max script revision rounds before holding", min: 1, max: 10 },
  { key: "qcLessonBelow", label: "QC lesson below", hint: "QC scores under this record a lesson", min: 0, max: 10, step: 0.5 },
  { key: "coldStartMin", label: "Cold-start minimum", hint: "Published-with-stats videos before performance ranking kicks in", min: 0, max: 50 },
  { key: "seedVisionFloor", label: "Seed vision floor", hint: "Minimum vision score for seeded frames", min: 0, max: 10, step: 0.5 },
  { key: "varietyMinDistance", label: "Variety min distance", hint: "Minimum topic distance between builds (0–32)", min: 0, max: 32 },
  { key: "autofixThreshold", label: "Autofix threshold", hint: "Frames under this score get an auto-fix pass", min: 0, max: 10, step: 0.5 },
  { key: "runFloor", label: "Run QC floor", hint: "Build-run videos under this are held", min: 0, max: 10, step: 0.5 },
  { key: "runPublic", label: "Run public bar", hint: "QC needed to auto-publish as Public", min: 0, max: 10, step: 0.5 },
  { key: "factRiskMax", label: "Fact-risk max", hint: "Scripts above this risk score are held", min: 0, max: 10, step: 0.5 },
  { key: "beatRelevanceFloor", label: "Beat visual relevance floor", hint: "Beat visuals below this (vision) are re-rolled to match the narration", min: 0, max: 10, step: 0.5 },
  { key: "timingFloor", label: "Self-Watch timing floor", hint: "Pre-publish timing dimension (coverage, pacing, length) must clear this", min: 0, max: 10, step: 0.5 },
  { key: "watchBlockPublishBelow", label: "Self-Watch publish floor", hint: "Overall Self-Watch score below this holds the video for a human", min: 0, max: 10, step: 0.5 },
  { key: "competitiveFloor", label: "Competitive-fit floor", hint: "Self-Watch competitive-fit (#4) must clear this to pass", min: 0, max: 10, step: 0.5 },
  { key: "transitionFloor", label: "Transitions floor", hint: "Self-Watch transitions (#1) must clear this to pass", min: 0, max: 10, step: 0.5 },
  { key: "watchTemporalEscalateAt", label: "Temporal escalate at", hint: "Shot boundaries at/above this trigger the temporal (Gemini) pass", min: 1, max: 20 },
  { key: "playbookShadowMinEvidence", label: "Lesson graduation: min evidence", hint: "Shadow quality lessons graduate to gating after recurring this many times", min: 1, max: 50 },
  { key: "playbookAutoGraduateConfidence", label: "Lesson graduation: min confidence", hint: "…and once confidence reaches this (0–1)", min: 0, max: 1, step: 0.05 },
];

export function QualityGatesCard({ initial }: { initial: QualityGates }) {
  const [values, setValues] = useState<Required<QualityGates>>({
    ...QUALITY_GATE_DEFAULTS,
    ...Object.fromEntries(
      Object.entries(initial).filter(([, v]) => typeof v === "number" && Number.isFinite(v)),
    ),
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const set = (key: GateKey, raw: string) => {
    setSaved(false);
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setValues((v) => ({ ...v, [key]: n }));
  };

  const save = () =>
    startTransition(async () => {
      setError(undefined);
      setSaved(false);
      const r = await saveQualityGatesAction(values);
      if (r.ok) setSaved(true);
      else setError(r.error ?? "Save failed.");
    });

  return (
    <Card>
      <CardTitle>Quality gates</CardTitle>
      <p className="mb-4 text-sm text-muted">
        These are the <span className="font-medium text-ink">pass/hold lines</span>,
        not grading dials. The agents grade against fixed rubrics; these
        thresholds decide what a given 0–10 score is allowed to do — raise them
        so more videos hold for you, lower them to let more through
        automatically.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3 rounded-xl bg-card-warm px-3 py-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{f.label}</span>
              <span className="block text-xs text-muted">{f.hint}</span>
            </span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              value={values[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-20 shrink-0 rounded-lg border border-line bg-card px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={isPending} onClick={save}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? "Saved" : "Save thresholds"}
        </Button>
        {error && <p className="text-xs font-medium text-coral">{error}</p>}
      </div>
    </Card>
  );
}
