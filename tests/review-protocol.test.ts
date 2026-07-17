/**
 * Reviewer protocols + structured blocker escalation (Batch 5). Pure tiering,
 * the 2-round cap, and the blocker shape.
 */
import { describe, expect, it } from "vitest";
import {
  blockerToReason,
  buildBlocker,
  MAX_REVIEW_ROUNDS,
  reviewFocusFor,
  reviewLoopDecision,
  tierFindings,
  type Finding,
} from "@studio/core";

describe("review focus", () => {
  it("gives each stage a specific lens", () => {
    expect(reviewFocusFor("assets").focus).toMatch(/distinctness/);
    expect(reviewFocusFor("cut").checks.length).toBeGreaterThan(0);
  });
});

describe("tierFindings", () => {
  const findings: Finding[] = [
    { severity: "critical", message: "broken frame" },
    { severity: "suggestion", message: "tighten hook" },
    { severity: "nitpick", message: "kerning" },
  ];
  it("splits by severity and blocks only on critical", () => {
    const t = tierFindings(findings);
    expect(t.critical).toHaveLength(1);
    expect(t.blocks).toBe(true);
    expect(tierFindings(findings.slice(1)).blocks).toBe(false);
  });
});

describe("reviewLoopDecision — max 2 rounds", () => {
  const crit = tierFindings([{ severity: "critical", message: "x" }]);
  const warn = tierFindings([{ severity: "suggestion", message: "y" }]);
  const clean = tierFindings([]);

  it("passes a clean review immediately", () => {
    const d = reviewLoopDecision(0, clean);
    expect(d).toMatchObject({ revise: false, passWithWarnings: false, escalate: false });
  });
  it("revises while under the cap with critical findings", () => {
    expect(reviewLoopDecision(0, crit).revise).toBe(true);
    expect(reviewLoopDecision(1, crit).revise).toBe(true);
  });
  it("escalates at the cap when critical remains", () => {
    const d = reviewLoopDecision(MAX_REVIEW_ROUNDS, crit);
    expect(d.escalate).toBe(true);
    expect(d.revise).toBe(false);
  });
  it("passes with warnings when only non-critical remains", () => {
    expect(reviewLoopDecision(0, warn).passWithWarnings).toBe(true);
  });
});

describe("structured blocker", () => {
  it("guarantees the shape and renders a reason line", () => {
    const b = buildBlocker({ blocker: "Seedance is down", category: "provider", tried: ["Kling", "LTX"], needs: "a working video provider", options: [{ id: "swap", label: "Swap provider" }], recommendation: "swap" });
    expect(b.tried).toEqual(["Kling", "LTX"]);
    expect(b.options[0].id).toBe("swap");
    expect(blockerToReason(b)).toMatch(/needs: a working video provider/);
  });
  it("fills defaults for a minimal blocker", () => {
    const b = buildBlocker({ blocker: "stuck" });
    expect(b.category).toBe("unknown");
    expect(b.options).toEqual([]);
  });
});
