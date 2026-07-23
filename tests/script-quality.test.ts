/**
 * Script-quality fixes (deep-dive remediation): the script generator was
 * producing (a) two redundant outro beats, (b) many beats all tagged "hero"
 * with no variety, and (c) beats so long the pattern-interrupt lint could never
 * pass. These assert the pure guards that fix each.
 */
import { describe, expect, it } from "vitest";
import {
  ensureCtaBeat,
  isCtaLike,
  rebalanceShotTypes,
  scriptWordBudget,
} from "@/lib/adapters/script";
import { lintPatternInterrupts } from "@/lib/pipeline/rubrics";
import type { ScriptBeat } from "@/lib/db/types";

const beat = (idx: number, text: string, shotType: ScriptBeat["shotType"] = "broll"): ScriptBeat => ({
  idx,
  text,
  visualPrompt: "a scene",
  shotType,
});

describe("ensureCtaBeat — exactly one closing CTA", () => {
  it("collapses two trailing sign-off beats into one", () => {
    const beats = [
      beat(0, "Here's the hook."),
      beat(1, "The core argument."),
      beat(2, "So that's the real takeaway on chips."),
      beat(3, "Hit like and subscribe for more."),
      beat(4, "And comment below what I should cover next."),
    ];
    const out = ensureCtaBeat(beats, "AI investing");
    // The two adjacent outros (3 and 4) collapse to one; the last is kept.
    expect(out).toHaveLength(4);
    expect(isCtaLike(out[out.length - 1].text)).toBe(true);
    expect(isCtaLike(out[out.length - 2].text)).toBe(false);
    expect(out.map((b) => b.idx)).toEqual([0, 1, 2, 3]);
  });

  it("leaves a script that already ends on a CTA untouched (no second outro)", () => {
    const beats = [
      beat(0, "Hook."),
      beat(1, "Body."),
      beat(2, "Subscribe so the next breakdown finds you."),
    ];
    const out = ensureCtaBeat(beats, "AI investing");
    expect(out).toHaveLength(3);
  });

  it("appends a CTA when none exists and names the niche only once", () => {
    const beats = [beat(0, "Hook."), beat(1, "A closing insight, no call to action.")];
    const out = ensureCtaBeat(beats, "semiconductors");
    expect(out).toHaveLength(3);
    expect(isCtaLike(out[2].text)).toBe(true);
    const nicheHits = out[2].text.toLowerCase().split("semiconductors").length - 1;
    expect(nicheHits).toBe(1); // the old fallback pasted it twice
  });
});

describe("rebalanceShotTypes — hero budget + variety", () => {
  it("caps heroes to ~n/4 (max 3) and demotes the rest", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ idx: i, shotType: "hero" as const }));
    const out = rebalanceShotTypes(items);
    const heroes = out.filter((x) => x.shotType === "hero").length;
    expect(heroes).toBeLessThanOrEqual(3);
    expect(heroes).toBeGreaterThanOrEqual(1);
    expect(out[0].shotType).toBe("hero"); // the hook is always kept
  });

  it("breaks an all-broll run by promoting within the hero budget", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ idx: i, shotType: "broll" as const }));
    const out = rebalanceShotTypes(items);
    // At least one adjacency now differs (a run was broken).
    let hasDiffAdjacent = false;
    for (let i = 1; i < out.length; i++) if (out[i].shotType !== out[i - 1].shotType) hasDiffAdjacent = true;
    expect(hasDiffAdjacent).toBe(true);
    expect(out.filter((x) => x.shotType === "hero").length).toBeLessThanOrEqual(3);
  });

  it("never forces a beat to stock (avoids the wallpaper failure)", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ idx: i, shotType: "broll" as const }));
    const out = rebalanceShotTypes(items);
    expect(out.some((x) => x.shotType === "stock")).toBe(false);
  });
});

describe("scriptWordBudget — shorter beats", () => {
  it("targets ~100-word beats so a single beat stays under the 45s interrupt limit", () => {
    const b = scriptWordBudget(240);
    const perBeat = b.target / b.beats;
    expect(perBeat).toBeLessThanOrEqual(110); // ~100 words ≈ 40s < 45s
    expect(b.beats).toBeGreaterThanOrEqual(5);
  });
});

describe("lintPatternInterrupts passes with short, varied beats", () => {
  it("short beats with alternating shot types clear the 45s limit", () => {
    const words = Array.from({ length: 90 }, (_, i) => `w${i}`).join(" "); // ~37s at 2.4 wps
    const beats = [
      { idx: 0, text: words, shotType: "hero" },
      { idx: 1, text: words, shotType: "broll" },
      { idx: 2, text: words, shotType: "hero" },
      { idx: 3, text: words, shotType: "broll" },
    ];
    expect(lintPatternInterrupts(beats).pass).toBe(true);
  });
});
