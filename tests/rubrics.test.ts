/**
 * rubrics.ts — the binary QC rubric engine (Harness C1). Score math and the
 * free structural lints are pure and money-adjacent: the pass-fraction score
 * feeds every gate threshold in the pipeline.
 */
import { describe, expect, it } from "vitest";
import {
  GATE_RUBRICS,
  computeLints,
  finalGateScore,
  lintLengthBand,
  lintPatternInterrupts,
  scoreFromCriteria,
  type CriterionResult,
} from "@/lib/pipeline/rubrics";

const named = (id: string, pass: boolean, weight = 1): CriterionResult => ({
  id, label: id, pass, note: "", weight, source: "judge",
});
/** The FINAL rubric shape: completeness(1), duration_band(1), publish_ready(2). */
const finalCriteria = (comp: boolean, dur: boolean, pub: boolean): CriterionResult[] => [
  named("completeness", comp, 1),
  named("duration_band", dur, 1),
  named("publish_ready", pub, 2),
];

const crit = (pass: boolean, weight = 1): CriterionResult => ({
  id: "x",
  label: "X",
  pass,
  note: "",
  weight,
  source: "judge",
});

describe("scoreFromCriteria", () => {
  it("is 10 when everything passes and 0 when everything fails", () => {
    expect(scoreFromCriteria([crit(true), crit(true)])).toBe(10);
    expect(scoreFromCriteria([crit(false), crit(false)])).toBe(0);
  });

  it("weights criteria (a weight-2 failure costs double)", () => {
    // pass 1 of {w1 pass, w2 fail} → 1/3 → 3.3
    expect(scoreFromCriteria([crit(true, 1), crit(false, 2)])).toBe(3.3);
    // inverse → 2/3 → 6.7
    expect(scoreFromCriteria([crit(false, 1), crit(true, 2)])).toBe(6.7);
  });

  it("returns 0 for an empty set (no free passes)", () => {
    expect(scoreFromCriteria([])).toBe(0);
  });
});

describe("finalGateScore (grounds FINAL in the real rendered video)", () => {
  it("blends structural gate with the vision score when a critique exists", () => {
    // structure fully passes (10) + vision 6 → 0.35*10 + 0.65*6 = 7.4
    expect(finalGateScore(finalCriteria(true, true, false), 6)).toEqual({ score: 7.4, grounded: true });
  });

  it("ignores the text publish_ready verdict — the vision score carries it", () => {
    // publish_ready fails (the phantom-zero criterion) but a real vision 8 stands
    const withVision = finalGateScore(finalCriteria(true, true, false), 8);
    expect(withVision.grounded).toBe(true);
    expect(withVision.score).toBeGreaterThan(7); // NOT the phantom ~5 the text rubric would give
  });

  it("a structurally broken render is still pulled down even with decent frames", () => {
    // completeness fails → structScore 5 → 0.35*5 + 0.65*7 = 6.3
    expect(finalGateScore(finalCriteria(false, true, true), 7)).toEqual({ score: 6.3, grounded: true });
  });

  it("no vision critique → scores structure only and marks it ungrounded (caller holds)", () => {
    const g = finalGateScore(finalCriteria(true, true, false), null);
    expect(g).toEqual({ score: 10, grounded: false }); // NOT a phantom 0 from unverifiable publish_ready
    const broken = finalGateScore(finalCriteria(false, false, false), null);
    expect(broken).toEqual({ score: 0, grounded: false }); // genuinely broken structure still scores low
  });

  it("clamps a wild vision score into range", () => {
    expect(finalGateScore(finalCriteria(true, true, true), 99).score).toBeLessThanOrEqual(10);
    expect(finalGateScore(finalCriteria(false, false, false), -5).score).toBeGreaterThanOrEqual(0);
  });
});

describe("GATE_RUBRICS", () => {
  it("every gate has 3+ criteria with unique ids and positive weights", () => {
    for (const [gate, rubric] of Object.entries(GATE_RUBRICS)) {
      expect(rubric.length, gate).toBeGreaterThanOrEqual(3);
      expect(new Set(rubric.map((c) => c.id)).size).toBe(rubric.length);
      for (const c of rubric) expect(c.weight).toBeGreaterThan(0);
    }
  });

  it("hook and promise-match carry double weight at the SCRIPT gate", () => {
    const byId = new Map(GATE_RUBRICS.SCRIPT.map((c) => [c.id, c]));
    expect(byId.get("hook")?.weight).toBe(2);
    expect(byId.get("promise_match")?.weight).toBe(2);
  });
});

describe("lintPatternInterrupts", () => {
  const beat = (idx: number, words: number, shotType: string) => ({
    idx,
    text: Array(words).fill("word").join(" "),
    shotType,
  });

  it("passes when shot types change often enough", () => {
    // ~25s per beat (60 words / 2.4 wps), alternating types → max run 25s.
    const beats = [beat(0, 60, "broll"), beat(1, 60, "hero"), beat(2, 60, "stock")];
    expect(lintPatternInterrupts(beats).pass).toBe(true);
  });

  it("fails on a long same-look stretch", () => {
    // Three consecutive 60-word broll beats ≈ 75s same look > 45s limit.
    const beats = [beat(0, 60, "broll"), beat(1, 60, "broll"), beat(2, 60, "broll")];
    const r = lintPatternInterrupts(beats);
    expect(r.pass).toBe(false);
    expect(r.note).toMatch(/without a visual change/);
  });

  it("fails empty beat lists rather than passing silently", () => {
    expect(lintPatternInterrupts([]).pass).toBe(false);
  });
});

describe("lintLengthBand", () => {
  it("passes within ±25% and fails outside", () => {
    expect(lintLengthBand(100, 100)?.pass).toBe(true);
    expect(lintLengthBand(80, 100)?.pass).toBe(true);
    expect(lintLengthBand(74, 100)?.pass).toBe(false);
    expect(lintLengthBand(130, 100)?.pass).toBe(false);
  });

  it("returns null (omitted, not guessed) when unmeasurable", () => {
    expect(lintLengthBand(null, 100)).toBeNull();
    expect(lintLengthBand(100, 0)).toBeNull();
  });
});

describe("computeLints", () => {
  it("only lints the SCRIPT gate and reads the qc context shape", () => {
    expect(computeLints("IDEA", {})).toEqual([]);
    const ctx = {
      targetLengthSec: 100,
      script: {
        runtime_sec: 100,
        beats: [{ idx: 0, text: "short beat", shotType: "broll" }],
      },
    };
    const lints = computeLints("SCRIPT", ctx);
    const ids = lints.map((l) => l.id);
    expect(ids).toContain("pattern_interrupts");
    expect(ids).toContain("length_band");
  });
});
