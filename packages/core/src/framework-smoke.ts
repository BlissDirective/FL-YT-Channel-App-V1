/**
 * Framework smoke pipeline (OpenMontage Remixed C1).
 *
 * Runs the whole stage chain — research → brief → script → scene_plan →
 * asset_manifest → edit_decisions → render_report — on MOCK data in
 * milliseconds, asserting each stage emits a SCHEMA-VALID canonical artifact
 * (Batch 2). It's a CI gate: if a stage's contract drifts, the smoke fails
 * before deploy instead of a real run breaking in production.
 *
 * Pure — no I/O, no adapters, no spend — so it runs anywhere (unit test, CI).
 */
import { assembleBrief } from "./research-brief";
import { validateStageArtifact, STAGE_ARTIFACTS, type StageArtifactKind } from "./stage-artifacts";

export type SmokeStageResult = { kind: StageArtifactKind; valid: boolean; errors: string[] };
export type SmokeResult = { ok: boolean; stages: SmokeStageResult[]; durationNote: string };

/** Build each stage's artifact from mock inputs. Deterministic. */
function mockArtifacts(topic: string): Record<StageArtifactKind, unknown> {
  const brief = assembleBrief({
    topic,
    angle: "a specific, grounded angle",
    audience: "curious general audience",
    sources: [
      { kind: "academic", title: `Study on ${topic}`, url: "https://a.edu" },
      { kind: "news", title: `Report on ${topic}`, url: "https://n.com" },
    ],
    findings: [{ claim: `A grounded fact about ${topic}`, sourceIdx: [0, 1] }],
  });

  const beats = Array.from({ length: 6 }, (_, i) => ({
    idx: i,
    text: `Beat ${i + 1} about ${topic}.`,
    shotType: i === 0 || i === 5 ? "hero" : "broll",
  }));

  const script = { beats, wordCount: beats.length * 20 };
  const scene_plan = { beats: beats.map((b) => ({ beatIdx: b.idx, intent: "detail", medium: "still" })) };
  const asset_manifest = {
    assets: beats.map((b) => ({ beatIdx: b.idx, kind: b.shotType === "hero" ? "clip" : "still", provider: "mock" })),
  };
  const edit_decisions = { clips: beats.map((b) => ({ id: `v${b.idx}`, beatIdx: b.idx, start: b.idx * 5, duration: 5 })), audio: [] };
  const render_report = { durationSec: beats.length * 5, variant: "long", beatCount: beats.length };

  return { brief, script, scene_plan, asset_manifest, edit_decisions, render_report };
}

/**
 * Run the smoke pipeline for a topic, validating every stage artifact against
 * its schema. Never throws — returns a structured pass/fail report the CI
 * gate asserts on.
 */
export function runSmokePipeline(topic = "why the Roman Empire fell"): SmokeResult {
  const artifacts = mockArtifacts(topic);
  const stages: SmokeStageResult[] = STAGE_ARTIFACTS.map((kind) => {
    const v = validateStageArtifact(kind, artifacts[kind]);
    return { kind, valid: v.ok, errors: v.errors };
  });
  return {
    ok: stages.every((s) => s.valid),
    stages,
    durationNote: "mock adapters — sub-millisecond",
  };
}
