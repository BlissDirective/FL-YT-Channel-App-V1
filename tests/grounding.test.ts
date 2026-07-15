/**
 * Visual Craft Engine V4 — grounded generation. Pure decision logic: which
 * intents want grounding, and entity extraction for the reference search.
 */
import { describe, expect, it } from "vitest";
import { wantsGrounding, extractEntity } from "@studio/core";

describe("wantsGrounding", () => {
  it("factual intents want grounding", () => {
    expect(wantsGrounding("data")).toBe(true);
    expect(wantsGrounding("detail")).toBe(true);
    expect(wantsGrounding("establish")).toBe(true);
  });
  it("stylistic/conceptual intents do not", () => {
    expect(wantsGrounding("concept")).toBe(false);
    expect(wantsGrounding("quote")).toBe(false);
    expect(wantsGrounding("hero")).toBe(false);
    expect(wantsGrounding("motion")).toBe(false);
  });
});

describe("extractEntity", () => {
  it("prefers a capitalized proper-noun run", () => {
    expect(extractEntity("The AlphaFold Protein model changed biology")).toBe("AlphaFold Protein");
  });
  it("falls back to the longest salient content word", () => {
    const e = extractEntity("it was an unprecedented transformation of the field");
    expect(["unprecedented", "transformation"]).toContain(e);
  });
  it("ignores stopwords and short words", () => {
    expect(extractEntity("the and for with that")).toBe("");
  });
  it("returns '' for empty/symbol-only text", () => {
    expect(extractEntity("   !!! ")).toBe("");
  });
});
