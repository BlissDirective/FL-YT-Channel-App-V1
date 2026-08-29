/**
 * Hook-variant fan-out (GTM): the A/B unit of a performance creative. Pure
 * planning helpers — one approved script → N variants differing only in the
 * hook beat, so the asset stage's content-hash cache reuses everything else.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_VARIANT_CAP,
  MAX_VARIANT_CAP,
  changedBeatIdxs,
  planHookVariants,
  variantAdName,
} from "@/lib/pipeline/variants";
import type { ScriptBeat } from "@/lib/db/types";

const beat = (idx: number, text: string): ScriptBeat => ({
  idx,
  text,
  visualPrompt: `visual ${idx}`,
  shotType: idx === 0 ? "hero" : "broll",
});

const SCRIPT = [
  beat(0, "You're paying a tax you can't see — every single sprint."),
  beat(1, "Here's the mechanism: one pipeline, no handoffs."),
  beat(2, "Teams cut review time 40% in the first month."),
  beat(3, "Grab the link below and start free."),
];

describe("planHookVariants", () => {
  it("keeps the original as Variant A and swaps only beat 0 in alternates", () => {
    const variants = planHookVariants({
      beats: SCRIPT,
      altHooks: ["Everyone says test more creative. They're wrong."],
    });
    expect(variants).toHaveLength(2);
    expect(variants[0]).toMatchObject({ key: "A", hook: SCRIPT[0].text });
    expect(variants[0].beats).toBe(SCRIPT); // untouched original
    expect(variants[1].key).toBe("B");
    expect(variants[1].beats[0].text).toBe("Everyone says test more creative. They're wrong.");
    // The swapped hook keeps the original visual direction and shot type.
    expect(variants[1].beats[0].visualPrompt).toBe(SCRIPT[0].visualPrompt);
    expect(variants[1].beats[0].shotType).toBe(SCRIPT[0].shotType);
  });

  it("shares beats 1..n BY REFERENCE so the asset cache sees them unchanged", () => {
    const [, b] = planHookVariants({ beats: SCRIPT, altHooks: ["A different angle."] });
    for (let i = 1; i < SCRIPT.length; i++) expect(b.beats[i]).toBe(SCRIPT[i]);
  });

  it("dedupes hooks that repeat the original or an earlier alternate (whitespace/case-insensitive)", () => {
    const variants = planHookVariants({
      beats: SCRIPT,
      altHooks: [
        "  you're paying a tax you can't see — every single SPRINT. ", // dupe of original
        "A real second angle.",
        "a REAL second   angle.", // dupe of previous alt
      ],
      max: 6,
    });
    expect(variants.map((v) => v.key)).toEqual(["A", "B"]);
    expect(variants[1].hook).toBe("A real second angle.");
  });

  it("caps at the default 3 total and hard-ceilings at MAX_VARIANT_CAP", () => {
    const hooks = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"];
    expect(planHookVariants({ beats: SCRIPT, altHooks: hooks })).toHaveLength(DEFAULT_VARIANT_CAP);
    expect(planHookVariants({ beats: SCRIPT, altHooks: hooks, max: 99 })).toHaveLength(MAX_VARIANT_CAP);
    expect(planHookVariants({ beats: SCRIPT, altHooks: hooks, max: 1 })).toHaveLength(1);
  });

  it("skips empty hooks and returns [] for an empty script", () => {
    expect(planHookVariants({ beats: [], altHooks: ["x"] })).toEqual([]);
    const variants = planHookVariants({ beats: SCRIPT, altHooks: ["", "   ", "Real one."] });
    expect(variants.map((v) => v.hook)).toEqual([SCRIPT[0].text, "Real one."]);
  });
});

describe("variantAdName", () => {
  it("names the original plainly and suffixes alternates", () => {
    expect(variantAdName("Spring launch", "A")).toBe("Spring launch");
    expect(variantAdName("Spring launch", "B")).toBe("Spring launch — Hook B");
    expect(variantAdName("  ", "B")).toBe("Untitled creative — Hook B");
  });
});

describe("changedBeatIdxs", () => {
  it("is exactly [0] for a hook variant and [] for the original", () => {
    const [a, b] = planHookVariants({ beats: SCRIPT, altHooks: ["New angle."] });
    expect(changedBeatIdxs(a, SCRIPT)).toEqual([]);
    expect(changedBeatIdxs(b, SCRIPT)).toEqual([0]);
  });

  it("flags length mismatches as changes (defensive for future body variants)", () => {
    const [a] = planHookVariants({ beats: SCRIPT, altHooks: [] });
    const shorter = SCRIPT.slice(0, 3);
    expect(changedBeatIdxs(a, shorter)).toEqual([3]);
  });
});
