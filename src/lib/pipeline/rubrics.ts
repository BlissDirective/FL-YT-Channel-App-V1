import type { ApprovalGate } from "@studio/core";

/**
 * Binary QC rubrics (Harness C1, Fable5-Agentic-Harness-Plan.md).
 *
 * Research is unambiguous that decomposed pass/fail criteria beat scalar
 * scores: undefined 0–10 numbers are noisy and unactionable, while atomic
 * criteria localize the failure AND make the judge calibratable against
 * human labels. Each gate's score is now the weighted pass-fraction × 10,
 * so every existing threshold (floors, copilot auto-approve, lessons)
 * keeps working unchanged.
 *
 * Two criterion sources:
 *  - "judge": the LLM answers the binary `test` with evidence-before-verdict.
 *  - "lint":  computed programmatically here (free, deterministic) — e.g.
 *    pattern-interrupt cadence and length band never need a model.
 *
 * Pure module (no I/O) so it's unit-testable.
 */

export type RubricCriterion = {
  id: string;
  /** Short label shown in the UI and in judge_labels. */
  label: string;
  /** The binary question the judge must answer with evidence. */
  test: string;
  /** Weight in the pass-fraction score (hook/promise-level criteria = 2). */
  weight: number;
};

export type CriterionResult = {
  id: string;
  label: string;
  pass: boolean;
  /** One-line evidence for the verdict (judge) or measurement (lint). */
  note: string;
  weight: number;
  source: "judge" | "lint";
};

export const GATE_RUBRICS: Record<ApprovalGate, RubricCriterion[]> = {
  IDEA: [
    {
      id: "objective_clarity",
      label: "Objective clarity",
      test: "Does the lesson idea state ONE concrete, demonstrable learning objective — something the learner can DO afterward — rather than a vague topic label?",
      weight: 2,
    },
    {
      id: "learner_fit",
      label: "Learner fit",
      test: "Does the lesson match the stated learner level and prerequisites — neither assuming skills they lack nor re-teaching what they already know?",
      weight: 1,
    },
    {
      id: "scope_discipline",
      label: "Scope discipline",
      test: "Is the scope achievable in one lesson (one objective, a handful of steps) — not a whole module's worth of material crammed into one video?",
      weight: 2,
    },
    {
      id: "sequence_fit",
      label: "Sequence fit",
      test: "Does the lesson build on what earlier lessons established and set up what follows, so the course compounds rather than fragmenting?",
      weight: 1,
    },
    {
      id: "assessment_potential",
      label: "Assessment potential",
      test: "Can this objective yield a fair check-for-understanding question (a quiz card) that a learner who watched can answer and one who skipped cannot?",
      weight: 1,
    },
  ],
  SCRIPT: [
    {
      id: "hook",
      label: "Objective hook",
      test: "Does the opening make the learner WANT the skill — naming the concrete capability and its payoff with ZERO throat-clearing (no greetings, no 'in this lesson we will', no dictionary definition)?",
      weight: 2,
    },
    {
      id: "promise_match",
      label: "Objective delivery",
      test: "Does the lesson actually teach the stated objective — every step needed is present, in learnable order, and the recap can honestly say 'you can now do this'?",
      weight: 2,
    },
    {
      id: "stepwise_clarity",
      label: "Stepwise clarity",
      test: "Does every beat teach exactly one idea, with terms defined at first use and prerequisite steps before dependent ones?",
      weight: 1,
    },
    {
      id: "worked_example",
      label: "Worked example",
      test: "Is there at least one concrete worked example that shows the skill done once for real, with the expert's thinking made visible?",
      weight: 1,
    },
    {
      id: "accuracy",
      label: "Accuracy",
      test: "Is every factual and technical claim correct and defensible — simplifications flagged as such, no invented statistics, sources, or 'studies show'?",
      weight: 2,
    },
    {
      id: "check_understanding",
      label: "Check for understanding",
      test: "Does the lesson pose at least one question or try-this the learner can answer, then confirm the answer (the quiz-card seed)?",
      weight: 1,
    },
    {
      id: "recap_bridge",
      label: "Recap + bridge",
      test: "Does the final beat restate what the learner can now do (tied to the objective) and bridge to what comes next — not a bare thanks-for-watching?",
      weight: 1,
    },
  ],
  ASSETS: [
    {
      id: "vo_coverage",
      label: "VO coverage",
      test: "Does the narration cover every beat with no missing or placeholder audio?",
      weight: 1,
    },
    {
      id: "visual_relevance",
      label: "Teaching support",
      test: "Does each beat's visual concept support the specific point being taught — the artifact, diagram, or example on screen matches the narration, not generic wallpaper?",
      weight: 2,
    },
    {
      id: "visual_variety",
      label: "Visual variety",
      test: "Do the visuals vary meaningfully across beats (instructor, slides, worked artifact) rather than repeating the same static look?",
      weight: 1,
    },
    {
      id: "thumb_coherence",
      label: "Title-card coherence",
      test: "Do the lesson's title card and title state the same single learning outcome?",
      weight: 1,
    },
  ],
  FINAL: [
    {
      id: "completeness",
      label: "Completeness",
      test: "Is the render complete — narration throughout, captions present where enabled, no dead or placeholder sections?",
      weight: 1,
    },
    {
      id: "duration_band",
      label: "Duration band",
      test: "Is the final duration within a reasonable band of the target length (roughly ±25%)?",
      weight: 1,
    },
    {
      id: "publish_ready",
      label: "Classroom-ready",
      test: "Would a paying learner perceive this as a finished, intentional lesson from a real instructor — clear, accurate, and worth their time?",
      weight: 2,
    },
  ],
};

/** Weighted pass-fraction → 0–10 score (1 decimal), so existing thresholds work. */
export function scoreFromCriteria(results: CriterionResult[]): number {
  const total = results.reduce((s, r) => s + r.weight, 0);
  if (total === 0) return 0;
  const passed = results.reduce((s, r) => s + (r.pass ? r.weight : 0), 0);
  return Math.round((passed / total) * 100) / 10;
}

/**
 * FINAL-gate score grounded in the REAL rendered video.
 *
 * The text QC judge never sees the render — it scores a JSON summary — so its
 * holistic `publish_ready` criterion is unverifiable and structurally fails
 * ("A criterion you cannot verify FAILS"), producing phantom near-zero FINAL
 * scores that measure nothing about the actual video. This grounds the FINAL
 * number instead:
 *
 *  - **vision present** (a frame critic scored the real rendered frames):
 *    blend the verifiable structural criteria (completeness, duration_band) as
 *    a gate with the vision overall carrying the perceptual "publish-ready"
 *    weight. Continuous — not quantized to the 3-criterion rubric's steps.
 *  - **vision absent**: score ONLY the verifiable structural criteria and mark
 *    it `grounded: false` — never fail a video on an unverifiable holistic guess
 *    from text. The caller HOLDS an ungrounded video for a real vision pass
 *    rather than trusting (or publishing on) a text-only verdict.
 *
 * Pure — unit-tested. `visionWeight` kept explicit so it's easy to tune.
 */
export function finalGateScore(
  criteria: CriterionResult[],
  visionScore: number | null | undefined,
  visionWeight = 0.65,
): { score: number; grounded: boolean } {
  const structural = criteria.filter((c) => c.id === "completeness" || c.id === "duration_band");
  const structTotal = structural.reduce((s, c) => s + c.weight, 0);
  const structScore =
    structTotal > 0
      ? (structural.reduce((s, c) => s + (c.pass ? c.weight : 0), 0) / structTotal) * 10
      : 10;
  if (typeof visionScore === "number" && Number.isFinite(visionScore)) {
    const v = Math.max(0, Math.min(10, visionScore));
    const w = Math.max(0, Math.min(1, visionWeight));
    return { score: Math.round((((1 - w) * structScore) + (w * v)) * 10) / 10, grounded: true };
  }
  return { score: Math.round(structScore * 10) / 10, grounded: false };
}

// ── Programmatic lints (free, deterministic — no model) ───────────────

type LintBeat = { idx: number; text: string; shotType?: string };

/** Spoken-word pacing used to estimate beat seconds when timings are absent. */
const WORDS_PER_SEC = 2.4;
/** A beat-type change (shot type) must occur at least this often. */
const MAX_SEC_WITHOUT_INTERRUPT = 45;

/**
 * Pattern-interrupt lint (Plan B2): estimate narration seconds per beat and
 * flag stretches longer than ~45s with no shot-type change — the documented
 * retention failure mode of monotone faceless videos.
 */
export function lintPatternInterrupts(beats: LintBeat[]): CriterionResult {
  const base = {
    id: "pattern_interrupts",
    label: "Pattern interrupts",
    weight: 1,
    source: "lint" as const,
  };
  if (beats.length === 0) {
    return { ...base, pass: false, note: "No beats to check." };
  }
  let runSec = 0;
  let worstRun = 0;
  let prevType = beats[0].shotType ?? "";
  for (const b of beats) {
    const sec = Math.max(1, (b.text?.split(/\s+/).length ?? 0) / WORDS_PER_SEC);
    const type = b.shotType ?? "";
    if (type === prevType) {
      runSec += sec;
    } else {
      runSec = sec;
      prevType = type;
    }
    worstRun = Math.max(worstRun, runSec);
  }
  const pass = worstRun <= MAX_SEC_WITHOUT_INTERRUPT;
  return {
    ...base,
    pass,
    note: pass
      ? `Longest same-look stretch ≈${Math.round(worstRun)}s (limit ${MAX_SEC_WITHOUT_INTERRUPT}s).`
      : `≈${Math.round(worstRun)}s without a visual change (limit ${MAX_SEC_WITHOUT_INTERRUPT}s) — break it up with a stat, question, or shot-type switch.`,
  };
}

/** Length-band lint: estimated runtime within ±25% of target. */
export function lintLengthBand(runtimeSec: number | null | undefined, targetSec: number | null | undefined): CriterionResult | null {
  const base = { id: "length_band", label: "Length band", weight: 1, source: "lint" as const };
  const runtime = Number(runtimeSec);
  const target = Number(targetSec);
  if (!Number.isFinite(runtime) || !Number.isFinite(target) || runtime <= 0 || target <= 0) {
    return null; // nothing measurable — omit rather than guess
  }
  const ratio = runtime / target;
  const pass = ratio >= 0.75 && ratio <= 1.25;
  return {
    ...base,
    pass,
    note: `Runtime ≈${Math.round(runtime)}s vs target ${Math.round(target)}s (${Math.round(ratio * 100)}%).`,
  };
}

/**
 * Compute the lint criteria available for a gate from the QC context. Kept
 * defensive: contexts are loosely-shaped JSON; anything unmeasurable is
 * simply omitted (the judge criteria still carry the score).
 */
export function computeLints(gate: ApprovalGate, context: Record<string, unknown>): CriterionResult[] {
  if (gate !== "SCRIPT") return [];
  const out: CriterionResult[] = [];
  const script = (context.script ?? {}) as {
    beats?: LintBeat[];
    runtime_sec?: number;
  };
  const beats = Array.isArray(script.beats) ? script.beats : [];
  if (beats.length > 0) out.push(lintPatternInterrupts(beats));
  const band = lintLengthBand(script.runtime_sec, (context as { targetLengthSec?: number }).targetLengthSec);
  if (band) out.push(band);
  return out;
}
