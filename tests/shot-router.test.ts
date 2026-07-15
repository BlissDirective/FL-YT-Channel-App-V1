/**
 * Visual Craft Engine V2 — the Medium Router. The pure routeMedium truth table
 * (intent → cheapest satisfying medium) + budget downshift + planCost bound are
 * the crux of V2's acceptance. Plus the deterministic mock intent classifier.
 */
import { describe, expect, it } from "vitest";
import {
  routeMedium,
  planCost,
  mediumToShotType,
  MEDIUM_COST,
  HERO_I2V_COST,
  type RouteContext,
} from "@studio/core";
import { mockBeatIntents } from "@/lib/adapters/shot-planner";

const rich: RouteContext = { budgetRemainingUsd: 100, stickAllowed: true, dataVizAllowed: true };

describe("routeMedium — intent → cheapest satisfying medium (budget ample)", () => {
  it("data → free chart", () => {
    expect(routeMedium({ beatIdx: 0, intent: "data" }, rich).medium).toBe("chart");
  });
  it("quote → free motion-graphic", () => {
    expect(routeMedium({ beatIdx: 0, intent: "quote" }, rich).medium).toBe("remotion");
  });
  it("concept → free stick when allowed, else remotion", () => {
    expect(routeMedium({ beatIdx: 0, intent: "concept" }, rich).medium).toBe("stick");
    expect(routeMedium({ beatIdx: 0, intent: "concept" }, { ...rich, stickAllowed: false }).medium).toBe("remotion");
  });
  it("establish (no motion) → still", () => {
    expect(routeMedium({ beatIdx: 0, intent: "establish" }, rich).medium).toBe("still");
  });
  it("hero → premium i2v when affordable", () => {
    const s = routeMedium({ beatIdx: 0, intent: "hero", hero: true }, rich);
    expect(s.medium).toBe("i2v");
    expect(s.estCostUsd).toBe(HERO_I2V_COST);
  });
  it("motion → i2v", () => {
    expect(routeMedium({ beatIdx: 0, intent: "motion" }, rich).medium).toBe("i2v");
  });
});

describe("routeMedium — budget downshift (never fails)", () => {
  it("hero with no money for premium → standard i2v, then still, then stock", () => {
    expect(routeMedium({ beatIdx: 0, intent: "hero", hero: true }, { budgetRemainingUsd: 0.25 }).medium).toBe("i2v");
    expect(routeMedium({ beatIdx: 0, intent: "hero", hero: true }, { budgetRemainingUsd: 0.05 }).medium).toBe("still");
    expect(routeMedium({ beatIdx: 0, intent: "hero", hero: true }, { budgetRemainingUsd: 0 }).medium).toBe("stock");
  });
  it("motion with tiny budget → still or stock, never overspends", () => {
    const s = routeMedium({ beatIdx: 0, intent: "motion" }, { budgetRemainingUsd: 0.03 });
    expect(["still", "stock"]).toContain(s.medium);
    expect(s.estCostUsd).toBeLessThanOrEqual(0.03);
  });
  it("free-medium intents never spend regardless of budget", () => {
    for (const intent of ["data", "quote", "concept"] as const) {
      expect(routeMedium({ beatIdx: 0, intent }, { budgetRemainingUsd: 0, dataVizAllowed: true, stickAllowed: true }).estCostUsd).toBe(0);
    }
  });
});

describe("routeMedium — cost never exceeds remaining budget (property)", () => {
  it("random intents/budgets never return a shot whose est cost > budget (except free)", () => {
    const intents = ["establish", "detail", "motion", "data", "concept", "quote", "hero"] as const;
    for (let i = 0; i < 500; i++) {
      const intent = intents[Math.floor(Math.random() * intents.length)];
      const budget = Math.random() * 1.5;
      const s = routeMedium({ beatIdx: 0, intent, hero: Math.random() > 0.7 }, { budgetRemainingUsd: budget, dataVizAllowed: true, stickAllowed: true });
      if (s.estCostUsd > 0) expect(s.estCostUsd).toBeLessThanOrEqual(budget + 1e-9);
    }
  });
});

describe("mediumToShotType", () => {
  it("maps mediums onto the executable shotType", () => {
    expect(mediumToShotType("i2v")).toBe("hero");
    expect(mediumToShotType("t2v")).toBe("hero");
    expect(mediumToShotType("still")).toBe("broll");
    expect(mediumToShotType("stock")).toBe("stock");
    expect(mediumToShotType("chart")).toBe("stock");
  });
});

describe("planCost", () => {
  it("sums shot estimates", () => {
    const plan = {
      beats: [
        { beatIdx: 0, shots: [{ id: "a", beatIdx: 0, intent: "hero" as const, medium: "i2v" as const, durationSec: 5, estCostUsd: HERO_I2V_COST, reason: "" }] },
        { beatIdx: 1, shots: [{ id: "b", beatIdx: 1, intent: "data" as const, medium: "chart" as const, durationSec: 4, estCostUsd: 0, reason: "" }] },
      ],
    };
    expect(planCost(plan)).toBe(HERO_I2V_COST);
  });
});

describe("mockBeatIntents (deterministic classifier)", () => {
  const beats = [
    { idx: 0, text: "Welcome to the story", visualPrompt: "a wide city", shotType: "broll" as const },
    { idx: 1, text: "Revenue grew 45% in 2024", visualPrompt: "a chart", shotType: "broll" as const },
    { idx: 2, text: "The hero moment", visualPrompt: "epic", shotType: "hero" as const },
  ];
  it("is stable and classifies data/hero/establish", () => {
    const a = mockBeatIntents(beats);
    const b = mockBeatIntents(beats);
    expect(a).toEqual(b);
    expect(a[0].intent).toBe("establish");
    expect(a[1].intent).toBe("data");
    expect(a[2].hero).toBe(true);
  });
});
