/**
 * Self-Watch Gate — pure core (Fable5-Self-Watch-Loop-Plan.md, Phase 0–1).
 *
 * Scores the assembled render at FINAL_REVIEW across two of the four criteria:
 *   #3 timing/pacing  — structural, from the render's beat timeline + media-QC
 *                       (no pixels): coverage, hook density, dead air, length
 *                       band, static-shot cadence.
 *   #2 script-match   — the per-beat narration-relevance verdicts the visual
 *                       gate already produced, re-read on the final cut.
 *
 * These are the static BASELINE criteria (Layer 1 of the plan's hybrid model) —
 * immutable, always run. The evolving layer lives in the C8 `quality` memory
 * namespace and rides on top. Pure + unit-tested; DB I/O lives in watch-runner.ts.
 */

export type WatchCriterionKey =
  | "beat_visual_coverage"
  | "hook_density_30s"
  | "no_dead_air"
  | "length_in_band"
  | "pattern_interrupt_cadence"
  | "beat_frame_relevance"
  // Competitive fit (#4) — judged by the LLM in watch-runner, not structural.
  | "hook_competitive"
  | "structure_retention_aligned"
  | "angle_differentiated"
  | "packaging_vs_winners"
  | "faceless_policy_transformative"
  // Transitions (#1) — structural Tier-1 + temporal Tier-2 (watch-runner).
  | "boundary_not_jarring"
  | "intro_outro_framing"
  | "motion_continuity";

export type WatchDimension = "timing" | "scriptMatch" | "competitive" | "transitions";

export type WatchCriterion = {
  key: WatchCriterionKey;
  label: string;
  dimension: WatchDimension;
  /** Static baseline (immutable) vs evolvable (the playbook may reweight). */
  baseline: boolean;
};

export const WATCH_RUBRIC: WatchCriterion[] = [
  { key: "beat_visual_coverage", label: "Every narrated beat has a visual", dimension: "timing", baseline: true },
  { key: "hook_density_30s", label: "≥2 visual changes in the first 30s", dimension: "timing", baseline: false },
  { key: "no_dead_air", label: "No silence gap over 1.5s", dimension: "timing", baseline: true },
  { key: "length_in_band", label: "Duration within ±25% of target", dimension: "timing", baseline: true },
  { key: "pattern_interrupt_cadence", label: "No static shot longer than 45s", dimension: "timing", baseline: false },
  { key: "beat_frame_relevance", label: "Each beat's visual depicts its narration", dimension: "scriptMatch", baseline: true },
  { key: "hook_competitive", label: "Hook matches or beats winning in-niche patterns", dimension: "competitive", baseline: false },
  { key: "structure_retention_aligned", label: "Structure/pacing aligns with what retains in-niche", dimension: "competitive", baseline: false },
  { key: "angle_differentiated", label: "Angle fills a gap vs. saturated coverage", dimension: "competitive", baseline: false },
  { key: "packaging_vs_winners", label: "Title/packaging is competitive vs. our winners", dimension: "competitive", baseline: false },
  { key: "faceless_policy_transformative", label: "Transformative value, not low-effort mass repetition", dimension: "competitive", baseline: true },
  { key: "boundary_not_jarring", label: "No jarring cut / flicker at shot boundaries", dimension: "transitions", baseline: true },
  { key: "intro_outro_framing", label: "Clean open (and loop-friendly end for Shorts)", dimension: "transitions", baseline: false },
  { key: "motion_continuity", label: "Coherent motion across cuts (temporal pass)", dimension: "transitions", baseline: false },
];

/** The competitive criteria judged by the LLM (watch-runner), in weight order. */
export const COMPETITIVE_CRITERIA: { key: WatchCriterionKey; label: string; weight: number; compliance?: boolean }[] = [
  { key: "hook_competitive", label: "Hook matches or beats winning in-niche patterns", weight: 2 },
  { key: "structure_retention_aligned", label: "Structure/pacing aligns with what retains in-niche", weight: 1 },
  { key: "angle_differentiated", label: "Angle fills a gap vs. saturated coverage", weight: 2 },
  { key: "packaging_vs_winners", label: "Title/packaging is competitive vs. our winners", weight: 1 },
  { key: "faceless_policy_transformative", label: "Transformative value, not low-effort mass repetition", weight: 2, compliance: true },
];

/** Weighted pass-fraction × 10 over the competitive criteria (pure). */
export function scoreCompetitive(passed: Record<WatchCriterionKey, boolean>): number {
  const total = COMPETITIVE_CRITERIA.reduce((s, c) => s + c.weight, 0);
  const got = COMPETITIVE_CRITERIA.reduce((s, c) => s + (passed[c.key] ? c.weight : 0), 0);
  return total === 0 ? 0 : Math.round((got / total) * 1000) / 100;
}

export type WatchIssue = {
  criterion: WatchCriterionKey;
  beatIdx: number | null;
  detail: string;
};

export type FixAction =
  | { kind: "reroll"; beatIdx: number; reason: string }
  | { kind: "retime"; beatIdx: number; reason: string }
  | { kind: "flag"; scope: "timing" | "script" | "render"; reason: string };

export type WatchDimensionResult = {
  score: number; // 0–10
  pass: boolean;
  /** false when there was no data to judge (degraded — never blocks). */
  evaluated: boolean;
  issues: WatchIssue[];
};

export type WatchVerdict = {
  overall: number;
  timing: WatchDimensionResult;
  scriptMatch: WatchDimensionResult;
  /** Competitive fit (#4) — LLM-judged in watch-runner; not evaluated when the
      judge is unavailable. */
  competitive: WatchDimensionResult;
  /** Transitions (#1) — structural Tier-1, refined by the temporal Tier-2 pass
      (watch-runner) when it escalates. */
  transitions: WatchDimensionResult;
  /** The compliance criterion (faceless/repetitive-content) failed → the video
      must hold for a human regardless of score. */
  policyRisk: boolean;
  /** Advisory competitive suggestions for the operator (from the judge). */
  competitiveSuggestions: string[];
  fixPlan: FixAction[];
  /** Graduated `quality`-namespace lessons applied for context (C8). */
  appliedLessons: string[];
  criteriaVersion: string;
  degraded: boolean;
  at: string;
};

export type WatchBeat = { idx: number; start: number; end: number; narrated: boolean; shotType?: string };
export type WatchClip = { beatIdx: number; relevance: number | null };
export type Boundary = { afterBeat: number; atSec: number };

export type WatchInputs = {
  targetLengthSec: number;
  durationSec: number;
  captionsOn: boolean;
  beats: WatchBeat[];
  clips: WatchClip[];
  /** Media-QC silence check: true=pass, false=fail, null=media-QC didn't run. */
  silencePass: boolean | null;
};

export type WatchThresholds = { timingFloor: number; scriptMatchFloor: number; transitionFloor: number };

export const CRITERIA_VERSION = "watch-v1";
const HOOK_WINDOW_SEC = 30;
const MAX_STATIC_SEC = 45;
const LENGTH_TOLERANCE = 0.25;
const MIN_BEAT_SEC = 1.2; // a shot shorter than this flashes by — a flicker cut
const CLEAN_OPEN_SEC = 0.5; // the first beat should start at ~0

/** passed/total as a 0–10 score. */
function score10(passed: number, total: number): number {
  return total === 0 ? 0 : Math.round((passed / total) * 1000) / 100;
}

const BASELINE_KEYS = new Set<WatchCriterionKey>(
  WATCH_RUBRIC.filter((c) => c.baseline).map((c) => c.key),
);

/** A dimension passes only when it clears the floor AND no *baseline* criterion
    failed — a baseline failure (e.g. a narrated beat with no visual) is the
    immutable floor and fails the dimension regardless of the aggregate. */
function dimensionPasses(score: number, floor: number, issues: WatchIssue[]): boolean {
  return score >= floor && !issues.some((i) => BASELINE_KEYS.has(i.criterion));
}

export function checkTiming(inputs: WatchInputs, t: WatchThresholds): WatchDimensionResult {
  const issues: WatchIssue[] = [];
  const clipBeats = new Set(inputs.clips.map((c) => c.beatIdx));
  let passed = 0;
  let total = 0;

  // beat_visual_coverage — every narrated beat has a visual.
  total++;
  const uncovered = inputs.beats.filter((b) => b.narrated && !clipBeats.has(b.idx));
  if (uncovered.length === 0) passed++;
  else
    for (const b of uncovered)
      issues.push({ criterion: "beat_visual_coverage", beatIdx: b.idx, detail: `Beat ${b.idx + 1} is narrated but has no visual.` });

  // hook_density_30s — at least two visual changes in the first 30s.
  total++;
  const inHook = inputs.beats.filter((b) => b.start < HOOK_WINDOW_SEC).length;
  if (inHook >= 2) passed++;
  else issues.push({ criterion: "hook_density_30s", beatIdx: null, detail: `Only ${inHook} visual change(s) in the first ${HOOK_WINDOW_SEC}s.` });

  // no_dead_air — reuse the render farm's media-QC silence check (skip if unrun).
  if (inputs.silencePass !== null) {
    total++;
    if (inputs.silencePass) passed++;
    else issues.push({ criterion: "no_dead_air", beatIdx: null, detail: "A silence gap over 1.5s was detected." });
  }

  // length_in_band — runtime within ±25% of the format target.
  if (inputs.targetLengthSec > 0) {
    total++;
    const dev = Math.abs(inputs.durationSec - inputs.targetLengthSec) / inputs.targetLengthSec;
    if (dev <= LENGTH_TOLERANCE) passed++;
    else
      issues.push({
        criterion: "length_in_band",
        beatIdx: null,
        detail: `Runtime ${Math.round(inputs.durationSec)}s is ${Math.round(dev * 100)}% off the ${inputs.targetLengthSec}s target.`,
      });
  }

  // pattern_interrupt_cadence — no single shot held longer than 45s.
  total++;
  const longBeats = inputs.beats.filter((b) => b.end - b.start > MAX_STATIC_SEC);
  if (longBeats.length === 0) passed++;
  else
    for (const b of longBeats)
      issues.push({
        criterion: "pattern_interrupt_cadence",
        beatIdx: b.idx,
        detail: `Beat ${b.idx + 1} holds one shot for ${Math.round(b.end - b.start)}s (>${MAX_STATIC_SEC}s).`,
      });

  const score = score10(passed, total);
  return { score, pass: dimensionPasses(score, t.timingFloor, issues), evaluated: total > 0, issues };
}

export function checkScriptMatch(inputs: WatchInputs, t: WatchThresholds): WatchDimensionResult {
  const rated = inputs.clips.filter((c) => typeof c.relevance === "number") as { beatIdx: number; relevance: number }[];
  if (rated.length === 0) {
    // No per-beat relevance data → not evaluated; never blocks on missing data.
    return { score: 0, pass: true, evaluated: false, issues: [] };
  }
  const issues: WatchIssue[] = [];
  for (const c of rated) {
    if (c.relevance < t.scriptMatchFloor) {
      issues.push({
        criterion: "beat_frame_relevance",
        beatIdx: c.beatIdx,
        detail: `Beat ${c.beatIdx + 1} visual scored ${c.relevance}/10 for narration relevance.`,
      });
    }
  }
  const mean = rated.reduce((s, c) => s + c.relevance, 0) / rated.length;
  const score = Math.round(mean * 100) / 100;
  return { score, pass: dimensionPasses(score, t.scriptMatchFloor, issues), evaluated: true, issues };
}

/** Shot-change boundaries — the candidate cut points the temporal pass inspects. */
export function transitionBoundaries(beats: WatchBeat[]): Boundary[] {
  const out: Boundary[] = [];
  for (let i = 0; i + 1 < beats.length; i++) {
    const a = beats[i];
    const n = beats[i + 1];
    // A boundary of interest = a shot-type change (or every cut when shot types
    // aren't tagged) — where a jarring jump is most likely.
    if (!a.shotType || !n.shotType || a.shotType !== n.shotType) out.push({ afterBeat: a.idx, atSec: n.start });
  }
  return out;
}

/** Structural (Tier-1) transitions check — flicker cuts + a clean open. No pixels. */
export function checkTransitions(inputs: WatchInputs, t: WatchThresholds): WatchDimensionResult {
  const issues: WatchIssue[] = [];
  let passed = 0;
  let total = 0;

  // boundary_not_jarring — no shot flashes by (a flicker cut).
  total++;
  const flicker = inputs.beats.filter((b) => b.end - b.start > 0 && b.end - b.start < MIN_BEAT_SEC);
  if (flicker.length === 0) passed++;
  else
    for (const b of flicker)
      issues.push({ criterion: "boundary_not_jarring", beatIdx: b.idx, detail: `Beat ${b.idx + 1} flashes by in ${(b.end - b.start).toFixed(1)}s.` });

  // intro_outro_framing — the video opens cleanly (first beat at ~0).
  total++;
  const first = [...inputs.beats].sort((a, b) => a.start - b.start)[0];
  if (!first || first.start <= CLEAN_OPEN_SEC) passed++;
  else issues.push({ criterion: "intro_outro_framing", beatIdx: first.idx, detail: `The first beat doesn't start until ${first.start.toFixed(1)}s — abrupt open.` });

  const score = score10(passed, total);
  return { score, pass: dimensionPasses(score, t.transitionFloor, issues), evaluated: total > 0, issues };
}

/** A temporal (Tier-2) verdict supplied by the runner (Gemini over our MP4). */
export type TemporalTransition = { score: number; evaluated: boolean; issues: WatchIssue[] };

/** Merge the structural Tier-1 dimension with the temporal Tier-2 verdict. The
    temporal pass actually watched the motion, so it's authoritative — transitions
    are a worst-link property, so we take the lower of the two scores. */
export function foldTemporal(structural: WatchDimensionResult, temporal: TemporalTransition, floor: number): WatchDimensionResult {
  if (!temporal.evaluated) return structural;
  const issues = [...structural.issues, ...temporal.issues];
  const score = Math.min(structural.score, temporal.score);
  return { score, pass: dimensionPasses(score, floor, issues), evaluated: true, issues };
}

/** The weakest evaluated dimension — recorded as the disputed criterion when the
    operator disagrees with a verdict, so the calibration surface can name it. */
export function lowestDimension(verdict: WatchVerdict): WatchDimension | null {
  const dims: [WatchDimension, WatchDimensionResult][] = [
    ["timing", verdict.timing],
    ["scriptMatch", verdict.scriptMatch],
    ["competitive", verdict.competitive],
    ["transitions", verdict.transitions],
  ];
  const evaluated = dims.filter(([, d]) => d.evaluated);
  if (evaluated.length === 0) return null;
  return evaluated.sort((a, b) => a[1].score - b[1].score)[0][0];
}

/** The re-rollable fixes (off-topic beats) — the autofix loop consumes these. */
export function rerollActions(verdict: WatchVerdict): { beatIdx: number; reason: string }[] {
  return verdict.fixPlan.filter((f): f is Extract<FixAction, { kind: "reroll" }> => f.kind === "reroll").map((f) => ({ beatIdx: f.beatIdx, reason: f.reason }));
}

export function deriveFixPlan(
  timing: WatchDimensionResult,
  scriptMatch: WatchDimensionResult,
  competitive?: WatchDimensionResult,
  transitions?: WatchDimensionResult,
): FixAction[] {
  const plan: FixAction[] = [];
  // Script-match: an off-topic beat is re-rollable → feed the existing autofix fixer.
  for (const i of scriptMatch.issues) {
    if (i.beatIdx != null) plan.push({ kind: "reroll", beatIdx: i.beatIdx, reason: i.detail });
  }
  // Timing: mostly not re-rollable → flag for a human / the script stage.
  for (const i of timing.issues) {
    if (i.criterion === "length_in_band") plan.push({ kind: "flag", scope: "script", reason: i.detail });
    else if (i.criterion === "pattern_interrupt_cadence") plan.push({ kind: "flag", scope: "timing", reason: i.detail });
    else plan.push({ kind: "flag", scope: "render", reason: i.detail });
  }
  // Competitive: packaging/structure feedback → flag at the script/idea altitude.
  for (const i of competitive?.issues ?? []) {
    plan.push({ kind: "flag", scope: "script", reason: `${i.criterion}: ${i.detail}` });
  }
  // Transitions: render-layer concerns (crossfade/reroll/transition template).
  for (const i of transitions?.issues ?? []) {
    plan.push({ kind: "flag", scope: "render", reason: `${i.criterion}: ${i.detail}` });
  }
  return plan;
}

/** A pre-computed competitive dimension supplied by the runner (LLM-judged). */
export type CompetitiveInput = {
  result: WatchDimensionResult;
  policyRisk: boolean;
  suggestions: string[];
};

const NEUTRAL_DIMENSION: WatchDimensionResult = { score: 0, pass: true, evaluated: false, issues: [] };

export function assembleVerdict(
  inputs: WatchInputs,
  t: WatchThresholds,
  now: string,
  appliedLessons: string[] = [],
  competitive?: CompetitiveInput | null,
  transitions?: WatchDimensionResult | null,
): WatchVerdict {
  const timing = checkTiming(inputs, t);
  const scriptMatch = checkScriptMatch(inputs, t);
  const comp = competitive?.result ?? NEUTRAL_DIMENSION;
  const trans = transitions ?? NEUTRAL_DIMENSION;
  const fixPlan = deriveFixPlan(timing, scriptMatch, comp, trans);
  const parts = [timing, scriptMatch, comp, trans].filter((d) => d.evaluated);
  const overall = parts.length
    ? Math.round((parts.reduce((s, d) => s + d.score, 0) / parts.length) * 100) / 100
    : 0;
  const degraded = parts.length === 0;
  return {
    overall,
    timing,
    scriptMatch,
    competitive: comp,
    transitions: trans,
    policyRisk: competitive?.policyRisk ?? false,
    competitiveSuggestions: competitive?.suggestions ?? [],
    fixPlan,
    appliedLessons,
    criteriaVersion: CRITERIA_VERSION,
    degraded,
    at: now,
  };
}
