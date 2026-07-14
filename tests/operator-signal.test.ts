/**
 * Director Mode D6 — operator-signal learning (spec §7.2/§7.3, §10.2.8). Pure
 * mining + taste-threshold math, and the scoping guarantee that mining reads
 * only director decision ledgers (autonomous flows never write them, so an
 * autonomous-only fixture yields no lessons).
 */
import { describe, expect, it } from "vitest";
import {
  mineOperatorSignal,
  tasteThreshold,
  type MinedDecision,
} from "@/lib/pipeline/operator-signal";

const advBelow = (stage: MinedDecision["stage"], score: number): MinedDecision => ({
  stage,
  action: "advance",
  agent_score: score,
  agent_verdict: "fail",
});
const rerenderPass = (stage: MinedDecision["stage"], score: number): MinedDecision => ({
  stage,
  action: "rerender",
  agent_score: score,
  agent_verdict: "pass",
});

describe("mineOperatorSignal", () => {
  it("emits a floor-over-rejects lesson after ≥3 advances below floor in a stage", () => {
    const decisions = [advBelow("script", 5.5), advBelow("script", 6), advBelow("script", 5)];
    const lessons = mineOperatorSignal(decisions);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].namespace).toBe("script");
    expect(lessons[0].text).toMatch(/over-rejects/);
    expect(lessons[0].count).toBe(3);
    expect(lessons[0].evidence).toMatch(/below floor/);
  });

  it("does NOT emit below the evidence threshold (2 events)", () => {
    expect(mineOperatorSignal([advBelow("script", 5), advBelow("script", 6)])).toHaveLength(0);
  });

  it("emits a generator-misses-the-bar lesson after ≥3 re-renders despite passing", () => {
    const decisions = [rerenderPass("visuals", 8), rerenderPass("visuals", 7.5), rerenderPass("visuals", 8.2)];
    const lessons = mineOperatorSignal(decisions);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].namespace).toBe("visual"); // visuals → visual namespace
    expect(lessons[0].text).toMatch(/missing the operator's bar/);
  });

  it("scopes per stage — mixed stages don't cross-pollute", () => {
    const decisions = [
      advBelow("script", 5),
      advBelow("script", 5),
      advBelow("edit", 4), // only 1 in edit → no edit lesson
    ];
    const lessons = mineOperatorSignal(decisions, 2);
    expect(lessons.map((l) => l.stage)).toEqual(["script"]);
  });

  it("§10.2.8: nothing to mine → no lessons (autonomous projects write no decisions)", () => {
    expect(mineOperatorSignal([])).toEqual([]);
  });
});

describe("tasteThreshold", () => {
  it("returns the lowest advanced score once ≥5 scored advances exist", () => {
    const decisions: MinedDecision[] = [8, 7, 6.5, 9, 6].map((s) => ({
      stage: "script",
      action: "advance",
      agent_score: s,
      agent_verdict: s >= 7 ? "pass" : "fail",
    }));
    const t = tasteThreshold(decisions, "script");
    expect(t).not.toBeNull();
    expect(t!.threshold).toBe(6);
    expect(t!.count).toBe(5);
  });

  it("returns null below the minimum decision count", () => {
    const decisions: MinedDecision[] = [8, 7].map((s) => ({
      stage: "script",
      action: "advance",
      agent_score: s,
      agent_verdict: "pass",
    }));
    expect(tasteThreshold(decisions, "script")).toBeNull();
  });

  it("ignores other stages", () => {
    const decisions: MinedDecision[] = [8, 7, 6, 9, 6].map((s) => ({
      stage: "visuals",
      action: "advance",
      agent_score: s,
      agent_verdict: "pass",
    }));
    expect(tasteThreshold(decisions, "script")).toBeNull();
  });
});
