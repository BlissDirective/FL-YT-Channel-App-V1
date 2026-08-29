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
      id: "icp_fit",
      label: "ICP fit",
      test: "Would the stated target buyer stop scrolling for this concept — does it open on a pain or outcome squarely inside their working week?",
      weight: 1,
    },
    {
      id: "pain_evidence",
      label: "Pain evidence",
      test: "Is the pain point concrete and costly (time, money, pipeline) in the brief's own terms — not a generic category problem the buyer doesn't actually feel?",
      weight: 2,
    },
    {
      id: "angle_differentiation",
      label: "Angle differentiation",
      test: "Does the creative angle differ meaningfully from the obvious ads in this category — a distinct pain, mechanism, or proof, not the same claim re-worded?",
      weight: 2,
    },
    {
      id: "hook_potential",
      label: "Hook potential",
      test: "Can this concept yield a first-3-seconds hook with one specific, scroll-stopping promise (not a vague benefit label)?",
      weight: 1,
    },
    {
      id: "offer_coherence",
      label: "Offer coherence",
      test: "Do the concept, the product's actual capability, and the CTA's offer line up — will the ad promise only what the product and offer deliver?",
      weight: 1,
    },
  ],
  SCRIPT: [
    {
      id: "hook",
      label: "Hook",
      test: "Does the first beat stop the scroll on the buyer's pain or a pattern interrupt with ZERO brand throat-clearing (no product name, no 'Introducing', no logo language)?",
      weight: 2,
    },
    {
      id: "promise_match",
      label: "Offer delivery",
      test: "Does the ad pay off exactly what the hook implied — the mechanism shown, the proof landed, and a CTA whose offer matches the promise (no bait)?",
      weight: 2,
    },
    {
      id: "beat_economy",
      label: "Beat economy",
      test: "Does every beat sit on the pain→stakes→mechanism→proof→CTA spine, with no filler sentences that don't earn their seconds?",
      weight: 1,
    },
    {
      id: "claim_compliance",
      label: "Claim compliance",
      test: "Is every stated result substantiable and typical-case honest — no invented testimonials or metrics, no 'guaranteed' outcomes, no fabricated urgency or fake scarcity?",
      weight: 2,
    },
    {
      id: "native_voice",
      label: "Native voice",
      test: "Does the script sound like a person, not a brand — first-person UGC energy or a sharp demo narrator, with zero ad-speak ('revolutionary', 'seamless', 'game-changing')?",
      weight: 1,
    },
    {
      id: "cta_clarity",
      label: "CTA clarity",
      test: "Does the final beat drive ONE clear, low-friction action tied to the offer (start free, book a demo, get the template) — stated with its immediate payoff, and never a stacked second ask?",
      weight: 1,
    },
  ],
  ASSETS: [
    {
      id: "vo_coverage",
      label: "VO coverage",
      test: "Does the voiceover cover every beat with no missing or placeholder narration?",
      weight: 1,
    },
    {
      id: "visual_relevance",
      label: "Product visibility",
      test: "Does each beat's visual support its specific claim — the product, UI, or outcome on screen matches what's being said, not generic 'wallpaper' footage?",
      weight: 2,
    },
    {
      id: "visual_variety",
      label: "Visual variety",
      test: "Do the visuals vary meaningfully across beats (presenter, product, proof) rather than repeating the same look?",
      weight: 1,
    },
    {
      id: "thumb_coherence",
      label: "Cover-frame coherence",
      test: "Do the cover frame / opening frame and the hook line reinforce the same single promise?",
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
      label: "Feed-ready",
      test: "Would a media buyer run this as-is — native to the feed, claim-safe, and indistinguishable from a strong human-made creative?",
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
