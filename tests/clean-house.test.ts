/**
 * Clean House triage core (Phase 2). Pure salvageability, verdict, cost
 * estimate, plan totals, and the budget-ceiling stop.
 */
import { describe, expect, it } from "vitest";
import {
  cleanHouseBudgetStop,
  cleanHouseCommittedSpend,
  cleanHouseLedgerStop,
  cleanHouseStallAction,
  cleanHouseTerminationStop,
  CLEAN_HOUSE_MAX_NO_PROGRESS_TICKS,
  CLEAN_HOUSE_MAX_TICKS,
  planCleanHouse,
  planWithinBudget,
  rankForBudget,
  triageAsset,
  type AssetSignals,
  type BudgetRankable,
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

describe("cleanHouseCommittedSpend", () => {
  it("takes the greater of real ledger and estimated commitments", () => {
    expect(cleanHouseCommittedSpend(2.47, 75.4)).toBe(75.4); // ledger lags → estimate governs
    expect(cleanHouseCommittedSpend(30, 12)).toBe(30); // real cost outran the estimate → ledger governs
    expect(cleanHouseCommittedSpend(0, 0)).toBe(0);
  });

  it("REGRESSION: a lagging ledger must not let a capped run overrun (ceiling $25)", () => {
    // The live incident: reconciled ledger was only $2.47 because MVDA cuts and
    // stage workers book cost asynchronously, while the run had already committed
    // $75.40 of advances. A ledger-only stop never fired; committed spend must.
    const ledger = 2.47;
    const committedEstimate = 75.4;
    const ceiling = 25;
    // Old (buggy) basis: ledger alone → never stops.
    expect(cleanHouseLedgerStop(ledger, ceiling)).toBe(false);
    // Fixed basis: committed spend → stops.
    expect(cleanHouseLedgerStop(cleanHouseCommittedSpend(ledger, committedEstimate), ceiling)).toBe(true);
    // And the per-item pre-check refuses the next advance on committed spend.
    expect(cleanHouseBudgetStop(cleanHouseCommittedSpend(ledger, committedEstimate), ceiling, 3.4)).toBe(true);
  });

  it("still funds advances while committed spend is under the ceiling", () => {
    // 7 items already committed (~$23.8 est), ledger still catching up at $1.10.
    const committed = cleanHouseCommittedSpend(1.1, 23.8);
    expect(cleanHouseBudgetStop(committed, 25, 1.0)).toBe(false); // one more $1 fits
    expect(cleanHouseBudgetStop(committed, 25, 3.4)).toBe(true); // a $3.40 advance does not
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

describe("rankForBudget", () => {
  const items: (BudgetRankable & { id: string })[] = [
    { id: "a", salvageability: 0.9, estCostUsd: 3.0, qcScore: 6.8, qcFloor: 7 }, // best odds, small gap
    { id: "b", salvageability: 0.5, estCostUsd: 0.4, qcScore: 5.0, qcFloor: 7 }, // cheapest, big gap
    { id: "c", salvageability: 0.7, estCostUsd: 2.0, qcScore: null, qcFloor: 7 }, // no score
  ];
  it("salvageability: highest first", () => {
    expect(rankForBudget(items, "salvageability").map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
  it("cheapest: lowest cost first", () => {
    expect(rankForBudget(items, "cheapest").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
  it("closest-to-floor: smallest QC gap first, null score last", () => {
    expect(rankForBudget(items, "closest-to-floor").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("does not mutate the input", () => {
    const copy = [...items];
    rankForBudget(items, "cheapest");
    expect(items).toEqual(copy);
  });
});

describe("planWithinBudget", () => {
  const ranked = [
    { id: "a", estCostUsd: 3 },
    { id: "b", estCostUsd: 2 },
    { id: "c", estCostUsd: 4 },
  ];
  it("funds greedily in order until the ceiling", () => {
    const r = planWithinBudget(ranked, 5);
    expect(r.funded.map((i) => i.id)).toEqual(["a", "b"]);
    expect(r.deferred.map((i) => i.id)).toEqual(["c"]);
    expect(r.fundedCostUsd).toBe(5);
  });
  it("no ceiling (<=0) funds everything", () => {
    const r = planWithinBudget(ranked, 0);
    expect(r.deferred).toHaveLength(0);
    expect(r.fundedCostUsd).toBe(9);
  });
  it("skips an item that doesn't fit but keeps trying cheaper later ones", () => {
    const r = planWithinBudget([{ id: "big", estCostUsd: 10 }, { id: "small", estCostUsd: 1 }], 2);
    expect(r.funded.map((i) => i.id)).toEqual(["small"]);
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
