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
  | "beat_frame_relevance";

export type WatchDimension = "timing" | "scriptMatch";

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
];

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
  fixPlan: FixAction[];
  /** Graduated `quality`-namespace lessons applied for context (C8). */
  appliedLessons: string[];
  criteriaVersion: string;
  degraded: boolean;
  at: string;
};

export type WatchBeat = { idx: number; start: number; end: number; narrated: boolean };
export type WatchClip = { beatIdx: number; relevance: number | null };

export type WatchInputs = {
  targetLengthSec: number;
  durationSec: number;
  captionsOn: boolean;
  beats: WatchBeat[];
  clips: WatchClip[];
  /** Media-QC silence check: true=pass, false=fail, null=media-QC didn't run. */
  silencePass: boolean | null;
};

export type WatchThresholds = { timingFloor: number; scriptMatchFloor: number };

export const CRITERIA_VERSION = "watch-v1";
const HOOK_WINDOW_SEC = 30;
const MAX_STATIC_SEC = 45;
const LENGTH_TOLERANCE = 0.25;

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

export function deriveFixPlan(timing: WatchDimensionResult, scriptMatch: WatchDimensionResult): FixAction[] {
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
  return plan;
}

export function assembleVerdict(
  inputs: WatchInputs,
  t: WatchThresholds,
  now: string,
  appliedLessons: string[] = [],
): WatchVerdict {
  const timing = checkTiming(inputs, t);
  const scriptMatch = checkScriptMatch(inputs, t);
  const fixPlan = deriveFixPlan(timing, scriptMatch);
  const parts = [timing, scriptMatch].filter((d) => d.evaluated);
  const overall = parts.length
    ? Math.round((parts.reduce((s, d) => s + d.score, 0) / parts.length) * 100) / 100
    : 0;
  const degraded = parts.length === 0;
  return { overall, timing, scriptMatch, fixPlan, appliedLessons, criteriaVersion: CRITERIA_VERSION, degraded, at: now };
}
