import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQcLive } from "@/lib/adapters/qc";
import { isFalLive } from "@/lib/adapters/fal";

/**
 * Tier-1 upfront quality gates (move gates BEFORE spend). All three gates —
 * the idea-score gate, the script-stage editorial gate, and the FLUX prompt
 * pre-check — are ALWAYS ON. The idea-score floor stays tunable (app_settings
 * key 'quality_gates' → { ideaFloor: number }); absent → DEFAULT_IDEA_FLOOR.
 *
 * Fail-closed policy: when a PAID asset provider is live but the QC/grading
 * model is mocked, we are about to pay to generate things we cannot judge — so
 * the gate blocks that spend rather than waving it through. When everything is
 * mocked (no key anywhere) there is no real spend, so the gates pass through.
 */

type Db = ReturnType<typeof createAdminClient>;

export const DEFAULT_IDEA_FLOOR = 6.0;

export type QualityGateConfig = {
  /** Always true — the gates are not optional. Kept for call-site clarity. */
  enabled: boolean;
  ideaFloor: number;
  /** Revision-loop UX warning and hard stop (per video). */
  revisionWarnAt: number;
  revisionHardCap: number;
  /** SCRIPT-gate QC reviews below this feed lessons into future prompts. */
  qcLessonBelow: number;
  /** Seed stills scoring below this are re-rolled before paying to animate. */
  seedVisionFloor: number;
  /** Minimum pHash distance between beat visuals before a variety re-roll. */
  varietyMinDistance: number;
  /** Published-with-stats videos needed before performance ranking kicks in. */
  coldStartMin: number;
  /** Auto-fix loop critique threshold (fix below this). */
  autofixThreshold: number;
  /** Build-run FINAL gate defaults (per-run values still win). */
  runFloor: number;
  runPublic: number;
  /** Script fact-check risk at/above this holds the video (Phase 4.2). */
  factRiskMax: number;
  /** Beat visuals scoring below this on narration-relevance are re-rolled/
      re-searched before render (vision gate). Reused by the Self-Watch gate's
      final-render script-match dimension (#2). */
  beatRelevanceFloor: number;
  /** Self-Watch gate (Fable5-Self-Watch-Loop-Plan.md). Timing dimension (#3)
      must clear this to pass. */
  timingFloor: number;
  /** Overall Self-Watch score below this holds the video for a human even on
      autopilot (the pre-publish gate's hard floor). */
  watchBlockPublishBelow: number;
  /** Self-Watch competitive-fit dimension (#4) must clear this to pass. */
  competitiveFloor: number;
  /** Self-Watch transitions dimension (#1) must clear this to pass. */
  transitionFloor: number;
  /** Shot boundaries at/above this count escalate to the temporal (Tier-2) pass. */
  watchTemporalEscalateAt: number;
  /** Shadow `quality`-namespace lessons graduate to gating once they recur at
      least this many times (C8 shadow→graduate lifecycle). */
  playbookShadowMinEvidence: number;
  /** …and once their confidence reaches this (0–1). */
  playbookAutoGraduateConfidence: number;
};

export const DEFAULT_QUALITY_GATES: QualityGateConfig = {
  enabled: true,
  ideaFloor: DEFAULT_IDEA_FLOOR,
  revisionWarnAt: 3,
  revisionHardCap: 4,
  qcLessonBelow: 7,
  seedVisionFloor: 6.0,
  varietyMinDistance: 6,
  coldStartMin: 5,
  autofixThreshold: 7,
  runFloor: 7.0,
  runPublic: 8.0,
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

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Clamp spec for every tunable quality-gate key — the single source of truth
 * the Settings save action and the runtime reader agree on. `int` rounds;
 * `decimal` keeps fractions (scores, confidence). Every key `getQualityGateConfig`
 * reads MUST appear here so a Settings save can round-trip it.
 */
export const GATE_CLAMPS: Record<
  string,
  { kind: "int" | "decimal"; lo: number; hi: number }
> = {
  ideaFloor: { kind: "decimal", lo: 0, hi: 10 },
  revisionWarnAt: { kind: "int", lo: 1, hi: 10 },
  revisionHardCap: { kind: "int", lo: 1, hi: 10 },
  qcLessonBelow: { kind: "decimal", lo: 0, hi: 10 },
  coldStartMin: { kind: "int", lo: 0, hi: 50 },
  seedVisionFloor: { kind: "decimal", lo: 0, hi: 10 },
  varietyMinDistance: { kind: "int", lo: 0, hi: 32 },
  autofixThreshold: { kind: "decimal", lo: 0, hi: 10 },
  runFloor: { kind: "decimal", lo: 0, hi: 10 },
  runPublic: { kind: "decimal", lo: 0, hi: 10 },
  factRiskMax: { kind: "decimal", lo: 0, hi: 10 },
  beatRelevanceFloor: { kind: "decimal", lo: 0, hi: 10 },
  timingFloor: { kind: "decimal", lo: 0, hi: 10 },
  watchBlockPublishBelow: { kind: "decimal", lo: 0, hi: 10 },
  competitiveFloor: { kind: "decimal", lo: 0, hi: 10 },
  transitionFloor: { kind: "decimal", lo: 0, hi: 10 },
  watchTemporalEscalateAt: { kind: "int", lo: 1, hi: 20 },
  playbookShadowMinEvidence: { kind: "int", lo: 1, hi: 50 },
  playbookAutoGraduateConfidence: { kind: "decimal", lo: 0, hi: 1 },
};

/**
 * Build the `app_settings.quality_gates` value to persist: clamp each provided
 * key per GATE_CLAMPS, drop absent/invalid keys, and MERGE onto the existing
 * stored blob. Merging (not replacing) is the fix for the bug where a Settings
 * save silently wiped keys the UI didn't send (e.g. revisionWarnAt / coldStartMin)
 * back to their defaults. Pure + unit-tested.
 */
export function mergeQualityGates(
  input: Record<string, number | undefined>,
  existing: Record<string, unknown> | null | undefined,
): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const [key, spec] of Object.entries(GATE_CLAMPS)) {
    const raw = input[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const v = spec.kind === "int" ? Math.round(raw) : raw;
    clean[key] = clamp(v, spec.lo, spec.hi);
  }
  const base = (existing ?? {}) as Record<string, number>;
  return { ...base, ...clean };
}

/** Per-instance cache — the engine consults thresholds at several points per
    hop; one DB read a minute is plenty for operator-tuned settings. */
let cached: { at: number; cfg: QualityGateConfig } | null = null;

/** Bust the per-instance cache. Called by the Settings save action so a warm
    serverless container doesn't keep serving pre-save safety thresholds for
    up to a minute after the operator changed them. */
export function invalidateQualityGateCache(): void {
  cached = null;
}

/** Resolve the quality-gate config. Gates are always enabled; every threshold
    is overridable via app_settings key 'quality_gates' (Settings UI card). */
export async function getQualityGateConfig(db?: Db): Promise<QualityGateConfig> {
  if (cached && Date.now() - cached.at < 60_000) return cached.cfg;
  const supabase = db ?? createAdminClient();
  const cfg = { ...DEFAULT_QUALITY_GATES };
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "quality_gates")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<QualityGateConfig>;
    const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
    cfg.ideaFloor = clamp(num(v.ideaFloor) ?? cfg.ideaFloor, 0, 10);
    cfg.revisionWarnAt = clamp(num(v.revisionWarnAt) ?? cfg.revisionWarnAt, 1, 10);
    cfg.revisionHardCap = clamp(num(v.revisionHardCap) ?? cfg.revisionHardCap, 1, 10);
    cfg.qcLessonBelow = clamp(num(v.qcLessonBelow) ?? cfg.qcLessonBelow, 0, 10);
    cfg.seedVisionFloor = clamp(num(v.seedVisionFloor) ?? cfg.seedVisionFloor, 0, 10);
    cfg.varietyMinDistance = clamp(num(v.varietyMinDistance) ?? cfg.varietyMinDistance, 0, 32);
    cfg.coldStartMin = clamp(num(v.coldStartMin) ?? cfg.coldStartMin, 0, 50);
    cfg.autofixThreshold = clamp(num(v.autofixThreshold) ?? cfg.autofixThreshold, 0, 10);
    cfg.runFloor = clamp(num(v.runFloor) ?? cfg.runFloor, 0, 10);
    cfg.runPublic = clamp(num(v.runPublic) ?? cfg.runPublic, 0, 10);
    cfg.factRiskMax = clamp(num(v.factRiskMax) ?? cfg.factRiskMax, 0, 10);
    cfg.beatRelevanceFloor = clamp(num(v.beatRelevanceFloor) ?? cfg.beatRelevanceFloor, 0, 10);
    cfg.timingFloor = clamp(num(v.timingFloor) ?? cfg.timingFloor, 0, 10);
    cfg.watchBlockPublishBelow = clamp(num(v.watchBlockPublishBelow) ?? cfg.watchBlockPublishBelow, 0, 10);
    cfg.competitiveFloor = clamp(num(v.competitiveFloor) ?? cfg.competitiveFloor, 0, 10);
    cfg.transitionFloor = clamp(num(v.transitionFloor) ?? cfg.transitionFloor, 0, 10);
    cfg.watchTemporalEscalateAt = clamp(num(v.watchTemporalEscalateAt) ?? cfg.watchTemporalEscalateAt, 1, 20);
    cfg.playbookShadowMinEvidence = clamp(num(v.playbookShadowMinEvidence) ?? cfg.playbookShadowMinEvidence, 1, 50);
    cfg.playbookAutoGraduateConfidence = clamp(num(v.playbookAutoGraduateConfidence) ?? cfg.playbookAutoGraduateConfidence, 0, 1);
  } catch {
    /* missing row / table → defaults */
  }
  cached = { at: Date.now(), cfg };
  return cfg;
}

/**
 * Fail-closed guard: true when a paid provider (fal) is live but the grading
 * model (Anthropic/QC) is NOT — i.e. we'd be spending on generation we can't QC.
 * Callers should block paid generation in that case.
 */
export function failClosedBlocksSpend(_cfg: QualityGateConfig): boolean {
  return isFalLive() && !isQcLive();
}

/**
 * Single source of truth for whether the auto-fix loop runs for a video
 * (Tier 9.1 semantics: ON by default, an explicit `false` opts out; the
 * per-video flag overrides the project default). The sweep, the build-runner
 * finalizer, and the operator approval pass must all agree on this — a
 * finalizer that thinks the loop is off will publish a cut the sweep is
 * still fixing.
 */
export function isAutofixEnabled(
  project: { autofix_enabled?: boolean | null },
  video: { autofix_enabled?: boolean | null },
): boolean {
  return video.autofix_enabled ?? project.autofix_enabled ?? true;
}

/**
 * QC score → publish privacy. Shared by BOTH final-gate settlers — the
 * build-runner finalizer and the operator approval pass — so the two owners
 * can't drift on what "public-worthy" means (Phase 7).
 */
export function privacyForScore(score: number, publicAt: number): "public" | "unlisted" {
  return score >= publicAt ? "public" : "unlisted";
}
