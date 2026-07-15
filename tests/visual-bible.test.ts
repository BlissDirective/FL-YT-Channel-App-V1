/**
 * Visual Craft Engine V1 — the Visual Bible. Pure prompt-conditioning
 * (applyBible / bibleNegatives / buildVisualPrompt) + the deterministic mock
 * bible. The flag-off invariance (no bible → today's prompt) is the key safety
 * property.
 */
import { describe, expect, it } from "vitest";
import {
  applyBible,
  bibleNegatives,
  buildVisualPrompt,
  type VisualBible,
} from "@studio/core";
import { mockVisualBible } from "@/lib/adapters/visual-bible";

const BIBLE: VisualBible = {
  subjects: [
    { id: "alphafold", label: "AlphaFold protein model", descriptor: "ribbon-diagram 3-D protein structure, teal on graphite" },
    { id: "pipeline", label: "drug pipeline", descriptor: "clean animated flow of pipeline stages" },
  ],
  setting: "computational-biology lab",
  palette: ["#0E7C86", "#1B1F24"],
  styleContract: "clean lab-tech realism; specific over generic",
  avoid: ["generic DNA double-helix", "microscope cliché", "generic DNA double-helix"],
};

describe("applyBible", () => {
  it("null/undefined bible returns the prompt unchanged (flag-off invariance)", () => {
    expect(applyBible("a protein folding", null)).toBe("a protein folding");
    expect(applyBible("a protein folding", undefined)).toBe("a protein folding");
  });

  it("injects the descriptor for a referenced subject (local relevance)", () => {
    const out = applyBible("show the AlphaFold protein model rotating", BIBLE);
    expect(out).toMatch(/ribbon-diagram 3-D protein structure/);
    expect(out).toMatch(/Style: clean lab-tech realism/);
    expect(out).toMatch(/Setting: computational-biology lab/);
    expect(out).toMatch(/Palette: #0E7C86, #1B1F24/);
  });

  it("does NOT inject an unreferenced subject's descriptor", () => {
    const out = applyBible("a wide establishing shot", BIBLE);
    expect(out).not.toMatch(/ribbon-diagram/);
    // …but still applies the global style contract for consistency.
    expect(out).toMatch(/Style: clean lab-tech realism/);
  });
});

describe("bibleNegatives", () => {
  it("dedupes the avoid list (case-insensitive), preserves order", () => {
    expect(bibleNegatives(BIBLE)).toBe("avoid: generic DNA double-helix, microscope cliché");
  });
  it("empty when no avoid list", () => {
    expect(bibleNegatives(null)).toBe("");
    expect(bibleNegatives({ subjects: [] })).toBe("");
  });
});

describe("buildVisualPrompt", () => {
  it("no bible → identical to the pre-VCE prompt (backward compatible)", () => {
    const withUndef = buildVisualPrompt("a city skyline", "cinematic");
    const withNull = buildVisualPrompt("a city skyline", "cinematic", null);
    expect(withUndef).toBe(withNull);
    expect(withUndef).toMatch(/a city skyline\. cinematic style, cinematic 16:9,/);
    expect(withUndef).not.toMatch(/avoid:/);
  });

  it("with bible → adds conditioning + avoid clause", () => {
    const out = buildVisualPrompt("the AlphaFold protein model", "cinematic", BIBLE);
    expect(out).toMatch(/ribbon-diagram 3-D protein structure/);
    expect(out).toMatch(/avoid: generic DNA double-helix, microscope cliché/);
  });
});

describe("mockVisualBible", () => {
  it("is deterministic and well-formed with zero spend context", () => {
    const opts = { title: "Why Protein Folding Changed Medicine", niche: "science", angle: "AI in pharma", tone: "authoritative", scriptText: "" };
    const { createdAt: _a, ...a } = mockVisualBible(opts);
    const { createdAt: _b, ...b } = mockVisualBible(opts);
    expect(a).toEqual(b); // deterministic (content, ignoring the timestamp)
    expect(a.subjects.length).toBeGreaterThan(0);
    expect(a.styleContract).toBeTruthy();
    expect(a.avoid?.length).toBeGreaterThan(0);
    expect(a.model).toBe("mock");
  });

  it("uses the brand palette when provided", () => {
    const a = mockVisualBible({ title: "T", niche: "n", angle: "a", tone: "t", scriptText: "", brandPalette: ["#111111", "#222222"] });
    expect(a.palette).toEqual(["#111111", "#222222"]);
  });
});
