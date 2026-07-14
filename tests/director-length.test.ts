/**
 * Director Mode D4 — length targeting (Fable-5-Director-Mode-Build-Spec.md §4.5).
 * Pure helpers in packages/core: bracket → word budget targeting math, the
 * duration classifier, and the length advisory builder that drives the console
 * chip + the "Revise to length" note.
 */
import { describe, expect, it } from "vitest";
import {
  DIRECTOR_LENGTH_BRACKETS,
  bracketById,
  bracketMidpointSec,
  classifyDuration,
  buildLengthAdvisory,
  formatDuration,
} from "@studio/core";

describe("brackets", () => {
  it("every bracket has a valid ordered window and unique id", () => {
    const ids = new Set<string>();
    for (const b of DIRECTOR_LENGTH_BRACKETS) {
      expect(b.minSec).toBeLessThan(b.maxSec);
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
    }
  });

  it("3–4 min bracket midpoint is 210s (drives the script word budget)", () => {
    const b = bracketById("3-4min")!;
    expect(b.minSec).toBe(180);
    expect(b.maxSec).toBe(240);
    expect(bracketMidpointSec(b)).toBe(210);
  });
});

describe("classifyDuration", () => {
  const b = bracketById("3-4min")!; // 180–240s, mid 210
  it("in-window", () => {
    expect(classifyDuration(210, b).verdict).toBe("in");
    expect(classifyDuration(180, b).verdict).toBe("in");
    expect(classifyDuration(240, b).verdict).toBe("in");
  });
  it("over/under with signed delta%", () => {
    const over = classifyDuration(277, b); // 4:37
    expect(over.verdict).toBe("over");
    expect(over.deltaPct).toBeGreaterThan(0);
    const under = classifyDuration(120, b); // 2:00
    expect(under.verdict).toBe("under");
    expect(under.deltaPct).toBeLessThan(0);
  });
});

describe("formatDuration", () => {
  it("m:ss", () => {
    expect(formatDuration(277)).toBe("4:37");
    expect(formatDuration(210)).toBe("3:30");
    expect(formatDuration(5)).toBe("0:05");
  });
});

describe("buildLengthAdvisory", () => {
  it("mock 3–4 min target lands in-window (acceptance): 210s estimate → in", () => {
    const a = buildLengthAdvisory({ actualSec: 210, bracketId: "3-4min", estimated: true })!;
    expect(a.verdict).toBe("in");
    expect(a.message).toMatch(/on target/i);
    expect(a.estimated).toBe(true);
    expect(a.targetLabel).toBe("3–4 min");
  });

  it("over-length produces an amber advisory with a tighten instruction", () => {
    const a = buildLengthAdvisory({ actualSec: 277, bracketId: "3-4min", estimated: false })!;
    expect(a.verdict).toBe("over");
    expect(a.actualLabel).toBe("4:37");
    expect(a.message).toMatch(/Tighten the script/);
    expect(a.message).toMatch(/\+\d+%/);
  });

  it("under-length asks to expand", () => {
    const a = buildLengthAdvisory({ actualSec: 90, bracketId: "3-4min", estimated: false })!;
    expect(a.verdict).toBe("under");
    expect(a.message).toMatch(/Expand the script/);
  });

  it("returns null for an unknown bracket or non-positive duration", () => {
    expect(buildLengthAdvisory({ actualSec: 0, bracketId: "3-4min", estimated: true })).toBeNull();
    expect(buildLengthAdvisory({ actualSec: 200, bracketId: "nope", estimated: true })).toBeNull();
  });
});
