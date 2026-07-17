/**
 * Localization & dub pipeline (Batch 12). Pure planning — which tracks a
 * repurpose swaps per language, and applying translated captions.
 */
import { describe, expect, it } from "vitest";
import { estimateDubCostUsd, getLanguage, localizeCaptions, planDub } from "@studio/core";

describe("planDub", () => {
  it("subtitle mode swaps only captions", () => {
    const p = planDub({ targetLang: "es", mode: "subtitle", voSegments: 10, captionPages: 20 });
    expect(p.swaps).toEqual(["captions"]);
    expect(p.voSegments).toBe(0);
    expect(p.captionPages).toBe(20);
  });
  it("dub mode swaps only VO", () => {
    const p = planDub({ targetLang: "fr", mode: "dub", voSegments: 10, captionPages: 20, voiceId: "v1" });
    expect(p.swaps).toEqual(["vo"]);
    expect(p.voSegments).toBe(10);
    expect(p.captionPages).toBe(0);
  });
  it("both mode swaps VO and captions", () => {
    expect(planDub({ targetLang: "de", mode: "both", voSegments: 5, captionPages: 8 }).swaps).toEqual(["vo", "captions"]);
  });
});

describe("estimateDubCostUsd", () => {
  it("scales with the swapped work and dub costs more than subtitle", () => {
    const sub = estimateDubCostUsd(planDub({ targetLang: "es", mode: "subtitle", voSegments: 10, captionPages: 20 }));
    const dub = estimateDubCostUsd(planDub({ targetLang: "es", mode: "dub", voSegments: 10, captionPages: 20 }));
    expect(dub).toBeGreaterThan(sub);
  });
});

describe("localizeCaptions", () => {
  it("applies translations, keeping timings and shape", () => {
    const pages = [{ text: "Hello", startMs: 0 }, { text: "World", startMs: 500 }];
    const out = localizeCaptions(pages, ["Hola", "Mundo"]);
    expect(out).toEqual([{ text: "Hola", startMs: 0 }, { text: "Mundo", startMs: 500 }]);
  });
  it("falls back to the source text when a translation is missing", () => {
    expect(localizeCaptions([{ text: "Hi" }], [])[0].text).toBe("Hi");
  });
});

describe("languages", () => {
  it("marks Arabic as RTL", () => {
    expect(getLanguage("ar")?.rtl).toBe(true);
  });
});
