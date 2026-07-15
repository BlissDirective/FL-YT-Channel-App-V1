/**
 * Visual Craft Engine V5 — Remotion scene vocabulary + overlay authoring (pure).
 * Mirrors the edd-render-units approach: test the authoring + math, not the
 * React render (the compositions consume these validated specs).
 */
import { describe, expect, it } from "vitest";
import {
  authorScene,
  validateSceneSpec,
  tickerValueAt,
  authorOverlay,
  extractStat,
  extractQuote,
  type SceneSpec,
} from "@studio/core";

describe("authorScene (intent → spec)", () => {
  it("quote intent → quote_card", () => {
    const s = authorScene("quote", { text: 'He said "the future is already here" plainly.' });
    expect(s?.kind).toBe("quote_card");
    expect((s as { quote: string }).quote).toContain("the future is already here");
  });
  it("data intent with an integer → number_ticker", () => {
    const s = authorScene("data", { text: "Revenue grew 45% last year" });
    expect(s?.kind).toBe("number_ticker");
    expect(s).toMatchObject({ to: 45, suffix: "%" });
  });
  it("data intent with a currency → ticker with $ prefix", () => {
    const s = authorScene("data", { text: "It cost $12 per unit" });
    expect(s).toMatchObject({ kind: "number_ticker", to: 12, prefix: "$" });
  });
  it("concept with 'vs' → comparison", () => {
    const s = authorScene("concept", { text: "Remotion vs generative video" });
    expect(s?.kind).toBe("comparison");
  });
  it("concept with steps → process_flow", () => {
    const s = authorScene("concept", { text: "First you plan. Then you script. Then you render." });
    expect(s?.kind).toBe("process_flow");
    expect((s as { steps: string[] }).steps.length).toBeGreaterThanOrEqual(2);
  });
  it("non-fitting intent → null (generate instead)", () => {
    expect(authorScene("hero", { text: "an epic vista" })).toBeNull();
    expect(authorScene("data", { text: "no numbers here" })).toBeNull();
  });
});

describe("validateSceneSpec", () => {
  it("valid specs return no problems", () => {
    expect(validateSceneSpec({ kind: "quote_card", quote: "hi", palette: ["#000"] })).toEqual([]);
    expect(validateSceneSpec({ kind: "number_ticker", from: 0, to: 10, palette: ["#000"] })).toEqual([]);
  });
  it("flags malformed specs", () => {
    expect(validateSceneSpec({ kind: "quote_card", quote: "", palette: ["#000"] })).toContain("quote_card missing quote");
    expect(validateSceneSpec({ kind: "number_ticker", from: 5, to: 5, palette: ["#000"] })).toContain("number_ticker needs to > from");
    expect(validateSceneSpec({ kind: "process_flow", steps: ["only one"], palette: ["#000"] })).toContain("process_flow needs ≥2 steps");
    expect(validateSceneSpec({ kind: "quote_card", quote: "hi", palette: [] })).toContain("empty palette");
  });
});

describe("tickerValueAt (eased count-up)", () => {
  it("starts at from, ends at to, monotonic", () => {
    expect(tickerValueAt(0, 100, 0, 40)).toBe(0);
    expect(tickerValueAt(0, 100, 40, 40)).toBe(100);
    const mid = tickerValueAt(0, 100, 20, 40);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });
  it("clamps past the duration", () => {
    expect(tickerValueAt(0, 50, 100, 40)).toBe(50);
  });
});

describe("authorOverlay (captions aligned to VO word timings)", () => {
  const words = [
    { w: "Revenue", start: 0, end: 0.4 },
    { w: "grew", start: 0.4, end: 0.7 },
    { w: "45%", start: 0.7, end: 1.1 },
    { w: "last", start: 1.1, end: 1.4 },
    { w: "year", start: 1.4, end: 1.8 },
  ];
  it("groups words into readable caption windows aligned to timings", () => {
    const ov = authorOverlay({ text: "Revenue grew 45% last year" }, words, { maxWordsPerCaption: 3 });
    expect(ov.captions).toHaveLength(2);
    expect(ov.captions[0]).toMatchObject({ text: "Revenue grew 45%", startMs: 0, endMs: 1100 });
    expect(ov.captions[1]).toMatchObject({ text: "last year", startMs: 1100, endMs: 1800 });
  });
  it("adds a stat callout when the beat names a number", () => {
    const ov = authorOverlay({ text: "Revenue grew 45% last year" }, words);
    expect(ov.callouts.some((c) => c.kind === "stat" && c.text.includes("45%"))).toBe(true);
  });
  it("no words → no captions", () => {
    expect(authorOverlay({ text: "no numbers" }, []).captions).toHaveLength(0);
  });
});

describe("extraction helpers", () => {
  it("extractStat pulls the number + label", () => {
    expect(extractStat("Revenue grew 45% last year")).toMatchObject({ value: "45%" });
    expect(extractStat("no numbers here")).toBeNull();
  });
  it("extractQuote prefers quoted spans", () => {
    expect(extractQuote('She said "seize the day" today')).toBe("seize the day");
  });
});
