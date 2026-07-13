/**
 * Insight applicability (Library/Insights review): only template kinds the
 * generation pipeline actually reads are "applicable" — applying any other
 * kind is advisory, never a dead template write. Keeps the "Applied" badge honest.
 */
import { describe, expect, it } from "vitest";
import { CONSUMED_TEMPLATE_KINDS, insightIsApplicable } from "../src/lib/insights-kinds";

describe("insightIsApplicable", () => {
  it("only 'script' templates are consumed today", () => {
    expect(CONSUMED_TEMPLATE_KINDS.has("script")).toBe(true);
    expect(insightIsApplicable("script", "New template body")).toBe(true);
  });

  it("proposed kinds nothing reads are advisory (not applicable)", () => {
    for (const kind of ["scoring", "thumbnail", "metadata"]) {
      expect(insightIsApplicable(kind, "body"), kind).toBe(false);
    }
  });

  it("body-only or empty insights are not applicable", () => {
    expect(insightIsApplicable(null, null)).toBe(false);
    expect(insightIsApplicable("script", null)).toBe(false);
    expect(insightIsApplicable(null, "body")).toBe(false);
    expect(insightIsApplicable("script", "")).toBe(false);
  });
});
