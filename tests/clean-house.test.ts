/**
 * Clean House triage core (Phase 2). Pure salvageability, verdict, cost
 * estimate, plan totals, and the budget-ceiling stop.
 */
import { describe, expect, it } from "vitest";
import {
  cleanHouseBudgetStop,
  cleanHouseLedgerStop,
  cleanHouseStallAction,
  cleanHouseTerminationStop,
  CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS,
  CLEAN_HOUSE_MAX_TICKS,
  planCleanHouse,
  triageAsset,
  type AssetSignals,
} from "@studio/core";

const base: AssetSignals = {
  status: "ASSETS_READY", qcScore: null, qcFloor: 7, watchPass: null,
  mediaHardFail: false, autofixAttempts: 0, hasScript: true, pausedReason: null,
};

describe("triageAsset", () => {
  it("advances a healthy mid-pipeline asset", () => {
    const t = triageAsset(base);
    expect(t.verdict).toBe("advance");
    expect(t.estCostUsd).toBeGreaterThan(0);
    expect(t.actions.length).toBeGreaterThan(0);
  });

  it("flags an asset that has exhausted autofix and is far below floor", () => {
    const t = triageAsset({ ...base, status: "FINAL_REVIEW", qcScore: 4, autofixAttempts: 2 });
    expect(t.verdict).toBe("flag");
    expect(t.estCostUsd).toBe(0);
    expect(t.reasons.join(" ")).toMatch(/autofix exhausted|below salvageability/);
  });

  it("rewards an already-passing asset", () => {
    const t = triageAsset({ ...base, status: "FINAL_REVIEW", qcScore: 8.2 });
    expect(t.verdict).toBe("advance");
    expect(t.salvageability).toBeGreaterThan(0.7);
  });

  it("skips terminal / archived assets", () => {
    expect(triageAsset({ ...base, status: "TRACKING" }).verdict).toBe("skip");
    expect(triageAsset({ ...base, archived: true }).verdict).toBe("skip");
    expect(triageAsset({ ...base, status: "KILLED" }).verdict).toBe("skip");
  });

  it("adds a re-render action on a media hard-fail", () => {
    const t = triageAsset({ ...base, status: "FINAL_REVIEW", mediaHardFail: true });
    expect(t.actions.join(" ")).toMatch(/re-render/i);
  });
});

describe("planCleanHouse", () => {
  it("rolls verdicts + advance cost into a run plan", () => {
    const plan = planCleanHouse([
      triageAsset(base),
      triageAsset({ ...base, status: "FINAL_REVIEW", qcScore: 4, autofixAttempts: 2 }),
      triageAsset({ ...base, status: "TRACKING" }),
    ]);
    expect(plan.advance).toBe(1);
    expect(plan.flag).toBe(1);
    expect(plan.skip).toBe(1);
    expect(plan.estCostUsd).toBeGreaterThan(0);
  });
});

describe("cleanHouseBudgetStop", () => {
  it("stops when the next paid step would exceed the ceiling", () => {
    expect(cleanHouseBudgetStop(9, 10, 2)).toBe(true);
    expect(cleanHouseBudgetStop(7, 10, 2)).toBe(false);
    expect(cleanHouseBudgetStop(100, 0, 5)).toBe(false); // 0 = no ceiling
  });
});

describe("cleanHouseLedgerStop", () => {
  it("hard-stops once real ledger spend reaches the ceiling", () => {
    expect(cleanHouseLedgerStop(10, 10)).toBe(true);
    expect(cleanHouseLedgerStop(12, 10)).toBe(true);
    expect(cleanHouseLedgerStop(9.99, 10)).toBe(false);
    expect(cleanHouseLedgerStop(1000, 0)).toBe(false); // 0 = no ceiling
  });
});

describe("cleanHouseTerminationStop", () => {
  it("auto-pauses at the tick ceiling", () => {
    const r = cleanHouseTerminationStop({ tickCount: CLEAN_HOUSE_MAX_TICKS, noProgressTicks: 0 });
    expect(r.stop).toBe(true);
    expect(r.reason).toMatch(/tick ceiling/);
  });
  it("auto-pauses after too many no-progress ticks", () => {
    const r = cleanHouseTerminationStop({ tickCount: 3, noProgressTicks: CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS });
    expect(r.stop).toBe(true);
    expect(r.reason).toMatch(/no progress/);
  });
  it("keeps running while inside the rails", () => {
    expect(cleanHouseTerminationStop({ tickCount: 5, noProgressTicks: 1 }).stop).toBe(false);
  });
});

describe("cleanHouseStallAction", () => {
  it("waits inside the stall window", () => {
    expect(cleanHouseStallAction(5, 0)).toBe("wait");
  });
  it("nudges past the window with nudges left", () => {
    expect(cleanHouseStallAction(45, 0)).toBe("nudge");
    expect(cleanHouseStallAction(90, 1)).toBe("nudge");
  });
  it("flags once nudges are exhausted", () => {
    expect(cleanHouseStallAction(120, 2)).toBe("flag");
  });
});
