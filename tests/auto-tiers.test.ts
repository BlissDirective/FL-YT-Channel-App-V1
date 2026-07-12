import { describe, expect, it } from "vitest";
import {
  planCostFor,
  selectClipBeats,
  tierJobForSection,
  type AutoTier,
} from "@/lib/adapters/auto-tiers";
import type { CustomSpec } from "@/lib/db/types";

const beat = (idx: number, scriptSec = 60, shotType = "broll") => ({ idx, shotType, scriptSec });

describe("tierJobForSection", () => {
  it("returns null for the base tier and for stock shots on every tier", () => {
    expect(tierJobForSection("base", "hero", 60)).toBeNull();
    expect(tierJobForSection("base", "broll", 60)).toBeNull();
    for (const tier of ["base", "economy", "premium", "platinum", "custom"] as AutoTier[]) {
      expect(tierJobForSection(tier, "stock", 60)).toBeNull();
    }
  });

  it("economy produces short Seedance Fast accents capped at 8s with a 4s floor", () => {
    expect(tierJobForSection("economy", "broll", 60)).toEqual({
      model: "seedance-2-fast",
      targetSec: 8,
      heroHold: true,
    });
    expect(tierJobForSection("economy", "broll", 2)?.targetSec).toBe(4);
  });

  it("premium sends heroes to Seedance 2.0 (8-15s) and b-roll to Fast (5-10s)", () => {
    expect(tierJobForSection("premium", "hero", 60)).toEqual({
      model: "seedance-2",
      targetSec: 15,
      heroHold: true,
    });
    expect(tierJobForSection("premium", "hero", 5)?.targetSec).toBe(8);
    expect(tierJobForSection("premium", "broll", 60)).toEqual({
      model: "seedance-2-fast",
      targetSec: 10,
      heroHold: false,
    });
  });

  it("platinum heroes are fixed 10s Kling clips", () => {
    expect(tierJobForSection("platinum", "hero", 60)).toEqual({
      model: "kling-2-5-turbo",
      targetSec: 10,
      heroHold: true,
    });
  });

  it("platinum b-roll drops to Seedance Fast on videos longer than 360s", () => {
    expect(tierJobForSection("platinum", "broll", 60, 360)?.model).toBe("seedance-2");
    expect(tierJobForSection("platinum", "broll", 60, 361)?.model).toBe("seedance-2-fast");
  });

  it("custom uses the operator recipe (clamped to the model) and fails safe to null", () => {
    const custom: CustomSpec = {
      heroModel: "veo-3-1",
      brollModel: "seedance-2-fast",
      heroSec: 7, // Veo only does 4/6/8 → snaps to 6
      brollSec: 99, // Fast maxes at 15
      maxUsd: 10,
    };
    expect(tierJobForSection("custom", "hero", 60, 0, custom)).toEqual({
      model: "veo-3-1",
      targetSec: 6,
      heroHold: true,
    });
    expect(tierJobForSection("custom", "broll", 60, 0, custom)?.targetSec).toBe(15);
    expect(tierJobForSection("custom", "hero", 60)).toBeNull(); // no spec
    expect(
      tierJobForSection("custom", "hero", 60, 0, { ...custom, heroModel: "not-a-model" }),
    ).toBeNull();
  });
});

describe("planCostFor", () => {
  it("costs rise monotonically with tier quality for both formats", () => {
    for (const format of ["short", "long"] as const) {
      expect(planCostFor(format, "base")).toBe(0);
      expect(planCostFor(format, "economy")).toBeGreaterThan(planCostFor(format, "base"));
      expect(planCostFor(format, "premium")).toBeGreaterThan(planCostFor(format, "economy"));
      expect(planCostFor(format, "platinum")).toBeGreaterThan(planCostFor(format, "premium"));
    }
  });

  it("long-form always plans more spend than a Short at the same tier", () => {
    for (const tier of ["economy", "premium", "platinum", "custom"] as AutoTier[]) {
      expect(planCostFor("long", tier)).toBeGreaterThan(planCostFor("short", tier));
    }
  });
});

describe("selectClipBeats", () => {
  it("base tier and stock-only scripts plan nothing", () => {
    expect(selectClipBeats("base", [beat(0), beat(1)])).toEqual({
      clips: [],
      totalUsd: 0,
      requestedUsd: 0,
      overBudget: false,
    });
    expect(selectClipBeats("premium", [beat(0, 60, "stock")]).clips).toEqual([]);
  });

  it("economy caps accents at 3 no matter how long the video is", () => {
    const beats = Array.from({ length: 10 }, (_, i) => beat(i)); // 600s total
    const sel = selectClipBeats("economy", beats);
    expect(sel.clips).toHaveLength(3);
    for (const c of sel.clips) expect(c.job.model).toBe("seedance-2-fast");
    // An explicit clipCap can only lower it further.
    expect(selectClipBeats("economy", beats, { clipCap: 1 }).clips).toHaveLength(1);
    expect(selectClipBeats("economy", beats, { clipCap: 99 }).clips).toHaveLength(3);
  });

  it("premium bookends with heroes at the first and last eligible beats (>=3 beats)", () => {
    const beats = [beat(0, 60, "stock"), beat(1), beat(2), beat(3), beat(4)];
    const sel = selectClipBeats("premium", beats);
    const heroes = sel.clips.filter((c) => c.shotType === "hero").map((c) => c.idx);
    expect(heroes.sort()).toEqual([1, 4]); // stock beat 0 is not hero-eligible
    for (const c of sel.clips.filter((c) => c.shotType === "hero")) {
      expect(c.job.model).toBe("seedance-2");
    }
  });

  it("collapses to a single hero below the 3-beat bookend minimum", () => {
    const sel = selectClipBeats("platinum", [beat(0), beat(1)]);
    const heroes = sel.clips.filter((c) => c.shotType === "hero");
    expect(heroes).toHaveLength(1);
    expect(heroes[0].idx).toBe(0);
    expect(heroes[0].job.model).toBe("kling-2-5-turbo");
  });

  it("platinum b-roll switches to cheap Seedance Fast when the video runs past 360s", () => {
    const long = Array.from({ length: 8 }, (_, i) => beat(i, 60)); // 480s
    const brolls = selectClipBeats("platinum", long).clips.filter((c) => c.shotType === "broll");
    expect(brolls.length).toBeGreaterThan(0);
    for (const c of brolls) expect(c.job.model).toBe("seedance-2-fast");

    const short = Array.from({ length: 5 }, (_, i) => beat(i, 60)); // 300s
    const brolls2 = selectClipBeats("platinum", short).clips.filter((c) => c.shotType === "broll");
    for (const c of brolls2) expect(c.job.model).toBe("seedance-2");
  });

  it("packs under maxUsd with heroes first and reports overBudget", () => {
    const beats = Array.from({ length: 5 }, (_, i) => beat(i, 60)); // 300s premium plan
    const full = selectClipBeats("premium", beats);
    expect(full.overBudget).toBe(false);
    expect(full.totalUsd).toBe(full.requestedUsd);

    const heroCost = 0.07 * 15; // one premium hero (Seedance 2.0 at 15s)
    const capped = selectClipBeats("premium", beats, { maxUsd: heroCost * 2 + 0.01 });
    expect(capped.overBudget).toBe(true);
    expect(capped.requestedUsd).toBe(full.requestedUsd);
    expect(capped.clips.map((c) => c.shotType)).toEqual(["hero", "hero"]); // budget buys impact
    expect(capped.totalUsd).toBeLessThanOrEqual(heroCost * 2 + 0.01);
  });

  it("costs scale with clip duration (longer beats bill more per accent)", () => {
    const shortBeats = [beat(0, 8), beat(1, 8), beat(2, 8)];
    const longBeats = [beat(0, 60), beat(1, 60), beat(2, 60)];
    const shortSel = selectClipBeats("premium", shortBeats);
    const longSel = selectClipBeats("premium", longBeats);
    const heroCost = (s: typeof shortSel) =>
      s.clips.find((c) => c.shotType === "hero")!.costUsd;
    expect(heroCost(longSel)).toBeGreaterThan(heroCost(shortSel));
  });
});

describe("director tier (MVDA Phase E)", () => {
  it("rides Platinum's exact visual plan — same jobs for hero and b-roll", () => {
    expect(tierJobForSection("director", "hero", 60)).toEqual(tierJobForSection("platinum", "hero", 60));
    expect(tierJobForSection("director", "broll", 60, 120)).toEqual(tierJobForSection("platinum", "broll", 60, 120));
    // Long-form cheap-b-roll switchover applies identically.
    expect(tierJobForSection("director", "broll", 60, 400)).toEqual(tierJobForSection("platinum", "broll", 60, 400));
    expect(tierJobForSection("director", "stock", 60)).toBeNull();
  });

  it("selects the same clips as platinum but plans the agent-session premium", () => {
    const beats = [beat(0), beat(1), beat(2), beat(3)];
    const director = selectClipBeats("director", beats);
    const platinum = selectClipBeats("platinum", beats);
    expect(director.clips).toEqual(platinum.clips);
    expect(director.totalUsd).toBe(platinum.totalUsd); // clip spend identical
    // The tier's delta (the ~$0.80 cut session) lives in the plan estimate.
    expect(planCostFor("long", "director")).toBeGreaterThan(planCostFor("long", "platinum"));
    expect(planCostFor("short", "director")).toBeGreaterThan(planCostFor("short", "platinum"));
  });
});
