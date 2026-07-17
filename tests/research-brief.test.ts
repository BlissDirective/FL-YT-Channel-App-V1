/**
 * Web-research-first cited brief (Batch 8). Pure confidence + the script-ready
 * context; only cited findings feed scripting.
 */
import { describe, expect, it } from "vitest";
import {
  assembleBrief,
  briefToScriptContext,
  citedFindings,
  findingConfidence,
  type ResearchSource,
} from "@studio/core";

const sources: ResearchSource[] = [
  { kind: "academic", title: "A study", url: "https://a.edu" },
  { kind: "news", title: "A report", url: "https://n.com" },
  { kind: "reddit", title: "A thread", url: "https://r.com" },
];

describe("findingConfidence", () => {
  it("is higher for more + more-credible citations", () => {
    const strong = findingConfidence(sources, [0, 1]); // academic + news
    const weak = findingConfidence(sources, [2]); // reddit only
    expect(strong).toBeGreaterThan(weak);
  });
  it("is 0 with no citations", () => {
    expect(findingConfidence(sources, [])).toBe(0);
  });
});

describe("assembleBrief + citedFindings", () => {
  const brief = assembleBrief({
    topic: "Why Rome fell",
    angle: "economic collapse",
    audience: "history buffs",
    sources,
    findings: [
      { claim: "Currency debasement accelerated collapse", sourceIdx: [0, 1] },
      { claim: "A random uncited hunch", sourceIdx: [] },
      { claim: "Forum speculation", sourceIdx: [2] },
    ],
    openQuestions: ["How fast was the debasement?"],
  });

  it("computes confidence per finding", () => {
    expect(brief.findings[0].confidence).toBeGreaterThan(0.6);
  });
  it("drops uncited findings from the trusted set", () => {
    const cited = citedFindings(brief);
    expect(cited.every((f) => f.sourceIdx.length > 0)).toBe(true);
    expect(cited.find((f) => /uncited/.test(f.claim))).toBeUndefined();
  });
  it("renders a citation-annotated script context", () => {
    const ctx = briefToScriptContext(brief);
    expect(ctx).toMatch(/GROUNDED FINDINGS/);
    expect(ctx).toMatch(/\[1\]\[2\]/); // the two-source finding
    expect(ctx).toMatch(/SOURCES:/);
    expect(ctx).toMatch(/a\.edu/);
  });
});
