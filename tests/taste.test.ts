/**
 * Taste profile, quality-rules-as-constraints, style playbooks & distinctness
 * (Batch 4). Pure enforcement + scoring.
 */
import { describe, expect, it } from "vitest";
import {
  applyPlaybook,
  checkQualityRules,
  DEFAULT_TASTE_PROFILE,
  getStylePlaybook,
  hasCriticalViolation,
  scoreDistinctness,
  STYLE_PLAYBOOKS,
  type QualityRule,
} from "@studio/core";

describe("checkQualityRules", () => {
  const rules: QualityRule[] = [
    { id: "wps", metric: "captionWordsPerSec", op: "lte", value: 3 },
    { id: "shot", metric: "shotLenSec", op: "gte", value: 1.2 },
    { id: "nit", metric: "paletteCount", op: "lte", value: 5, severity: "nitpick" },
  ];
  it("returns no violations for compliant metrics", () => {
    expect(checkQualityRules(rules, { captionWordsPerSec: 2, shotLenSec: 2, paletteCount: 4 })).toEqual([]);
  });
  it("flags a violated constraint with the measured value", () => {
    const v = checkQualityRules(rules, { captionWordsPerSec: 5, shotLenSec: 2 });
    expect(v).toHaveLength(1);
    expect(v[0].measured).toBe(5);
    expect(v[0].severity).toBe("critical");
  });
  it("skips metrics the caller didn't measure", () => {
    expect(checkQualityRules(rules, { captionWordsPerSec: 2 })).toEqual([]);
  });
  it("respects severity for the critical-block gate", () => {
    const v = checkQualityRules(rules, { paletteCount: 9 });
    expect(v[0].severity).toBe("nitpick");
    expect(hasCriticalViolation(v)).toBe(false);
    const crit = checkQualityRules(rules, { shotLenSec: 0.5 });
    expect(hasCriticalViolation(crit)).toBe(true);
  });
});

describe("style playbooks", () => {
  it("every playbook has an id, palette, and rules", () => {
    for (const p of STYLE_PLAYBOOKS) {
      expect(p.palette.length).toBeGreaterThan(0);
      expect(p.qualityRules.length).toBeGreaterThan(0);
    }
  });
  it("applyPlaybook overrides dials and merges rules by id", () => {
    const pb = getStylePlaybook("kinetic-short")!;
    const merged = applyPlaybook(DEFAULT_TASTE_PROFILE, pb);
    expect(merged.motionIntensity).toBe(4);
    // playbook's caption rule (3.5) overrides the default (3)
    expect(merged.qualityRules.find((r) => r.id === "caption_max_wps")?.value).toBe(3.5);
    // a default-only rule survives the merge
    expect(merged.qualityRules.find((r) => r.id === "palette_limit")).toBeTruthy();
  });
});

describe("scoreDistinctness", () => {
  it("passes a specific, signature-bearing, varied video", () => {
    const v = scoreDistinctness({ genericPhrases: 0, mediumVariety: 4, hasSignatureElement: true, specificClaims: 5 });
    expect(v.pass).toBe(true);
    expect(v.score).toBeGreaterThan(0.7);
  });
  it("fails a generic, signature-less, unspecific video", () => {
    const v = scoreDistinctness({ genericPhrases: 3, mediumVariety: 1, hasSignatureElement: false, specificClaims: 0 });
    expect(v.pass).toBe(false);
    expect(v.reasons.length).toBeGreaterThan(0);
  });
});
