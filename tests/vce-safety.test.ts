/**
 * Visual Craft Engine — cross-cutting safety suite (build spec §6).
 *
 * These invariants must hold no matter which VCE systems ship. They are the
 * guardrails the whole engine is allowed to evolve behind:
 *   1. Flag-off invariance — with every flag false, prompt construction is
 *      byte-identical to pre-VCE (no bible, no negatives).
 *   2. Cost-never-exceeds-plan — a routed plan never budgets more than the
 *      visual budget it was planned against, and each shot's cost is bounded.
 *   3. Determinism — the same inputs always produce the same plan/prompt (no
 *      hidden clocks or RNG in the pure/mock path), so goldens are stable.
 */
import { describe, expect, it } from "vitest";
import {
  buildVisualPrompt,
  applyBible,
  bibleNegatives,
  routeMedium,
  planCost,
  MEDIUM_COST,
  HERO_I2V_COST,
  type ShotInput,
  type RouteContext,
  type ShotIntent,
} from "@studio/core";
import { planShots, mockBeatIntents } from "@/lib/adapters/shot-planner";
import { VCE_DEFAULTS } from "@/lib/pipeline/vce";
import type { ScriptBeat } from "@/lib/db/types";

const beat = (over: Partial<ScriptBeat> = {}): ScriptBeat => ({
  idx: 0,
  text: "A quiet lab at dawn",
  visualPrompt: "a quiet research lab at dawn",
  shotType: "broll",
  motion: false,
  ...over,
});

const script: ScriptBeat[] = [
  beat({ idx: 0, text: "Open on the city", visualPrompt: "sweeping city skyline" }),
  beat({ idx: 1, text: "Growth hit 40 percent", visualPrompt: "a rising line", shotType: "broll" }),
  beat({ idx: 2, text: "Imagine two futures compared", visualPrompt: "a fork in the road" }),
  beat({ idx: 3, text: "The hero moment", visualPrompt: "a lone figure on a ridge", shotType: "hero" }),
  beat({ idx: 4, text: "A tight detail", visualPrompt: "hands on a keyboard", motion: true }),
];

describe("VCE §6.1 — flag-off invariance", () => {
  it("every flag defaults off", () => {
    expect(Object.values(VCE_DEFAULTS).every((v) => v === false)).toBe(true);
  });

  it("buildVisualPrompt with no bible === buildVisualPrompt with null bible", () => {
    const raw = "a lone figure on a windswept ridge at golden hour";
    expect(buildVisualPrompt(raw, "cinematic")).toBe(buildVisualPrompt(raw, "cinematic", null));
    expect(buildVisualPrompt(raw, "cinematic")).toBe(buildVisualPrompt(raw, "cinematic", undefined));
  });

  it("bible-off adds no directive text and no negatives", () => {
    const raw = "hands on a keyboard";
    expect(applyBible(raw, null)).toBe(raw);
    expect(applyBible(raw, undefined)).toBe(raw);
    expect(bibleNegatives(null)).toBe("");
    // With the bible off the built prompt carries only the pre-VCE scaffolding.
    const built = buildVisualPrompt(raw, "documentary");
    expect(built).not.toMatch(/avoid:/);
    expect(built).not.toMatch(/Style:/);
    expect(built).not.toMatch(/Depict specifically:/);
  });
});

describe("VCE §6.2 — cost never exceeds plan", () => {
  it("no single shot ever costs more than the hero ceiling", () => {
    const ceiling = HERO_I2V_COST;
    const intents: ShotIntent[] = ["establish", "detail", "motion", "data", "concept", "quote", "hero"];
    for (const intent of intents) {
      for (const budget of [0, 0.03, 0.2, 0.5, 8]) {
        const ctx: RouteContext = { budgetRemainingUsd: budget, dataVizAllowed: true, stickAllowed: true };
        const shot = routeMedium({ beatIdx: 0, intent, hero: intent === "hero" }, ctx);
        expect(shot.estCostUsd).toBeLessThanOrEqual(ceiling);
        expect(shot.estCostUsd).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("a shot never routes to a medium it cannot afford (except free floor)", () => {
    // With almost no budget, everything downshifts to a free/near-free medium.
    const ctx: RouteContext = { budgetRemainingUsd: 0, dataVizAllowed: true, stickAllowed: true };
    const inputs: ShotInput[] = [
      { beatIdx: 0, intent: "hero", hero: true },
      { beatIdx: 1, intent: "motion", wantsMotion: true },
      { beatIdx: 2, intent: "detail" },
      { beatIdx: 3, intent: "establish" },
    ];
    for (const inp of inputs) {
      const shot = routeMedium(inp, ctx);
      expect(shot.estCostUsd).toBeLessThanOrEqual(ctx.budgetRemainingUsd + 1e-9);
    }
  });

  it("planShots total never exceeds the video budget", async () => {
    for (const budget of [0, 0.05, 0.25, 0.5, 1, 8]) {
      const plan = await planShots({
        beats: script,
        ctx: { budgetRemainingUsd: budget, dataVizAllowed: true, stickAllowed: true },
        budgetUsd: budget,
      });
      expect(plan.planCostUsd).toBeLessThanOrEqual(budget + 1e-9);
      expect(plan.planCostUsd).toBe(planCost(plan));
    }
  });

  it("planCost equals the summed, rounded shot cost", async () => {
    const plan = await planShots({
      beats: script,
      ctx: { budgetRemainingUsd: 8, dataVizAllowed: true, stickAllowed: true },
      budgetUsd: 8,
    });
    const manual =
      Math.round(plan.beats.reduce((s, b) => s + b.shots.reduce((ss, sh) => ss + sh.estCostUsd, 0), 0) * 100) / 100;
    expect(plan.planCostUsd).toBe(manual);
  });

  it("MEDIUM_COST free tier really is free", () => {
    for (const m of ["remotion", "chart", "stick", "stock"] as const) {
      expect(MEDIUM_COST[m]).toBe(0);
    }
  });
});

describe("VCE §6.3 — determinism", () => {
  it("routeMedium is a pure function of its inputs", () => {
    const ctx: RouteContext = { budgetRemainingUsd: 8, dataVizAllowed: true, stickAllowed: true };
    const a = routeMedium({ beatIdx: 3, intent: "hero", hero: true }, ctx);
    const b = routeMedium({ beatIdx: 3, intent: "hero", hero: true }, ctx);
    expect(a).toEqual(b);
  });

  it("mockBeatIntents is stable across calls", () => {
    expect(mockBeatIntents(script)).toEqual(mockBeatIntents(script));
  });

  it("planShots (mock path) produces an identical plan across runs", async () => {
    const opts = {
      beats: script,
      ctx: { budgetRemainingUsd: 8, dataVizAllowed: true, stickAllowed: true } as RouteContext,
      budgetUsd: 8,
    };
    const [p1, p2] = await Promise.all([planShots(opts), planShots(opts)]);
    expect(p1).toEqual(p2);
  });

  it("buildVisualPrompt is deterministic (no clock/RNG)", () => {
    const raw = "a sweeping city skyline at golden hour";
    expect(buildVisualPrompt(raw, "cinematic")).toBe(buildVisualPrompt(raw, "cinematic"));
  });
});
