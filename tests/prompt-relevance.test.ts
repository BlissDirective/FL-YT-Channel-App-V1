/**
 * assessPromptRelevance (Plan B3) — the free lexical relevance check that
 * catches generic "wallpaper" visuals before paying FLUX. Pure function.
 */
import { describe, expect, it } from "vitest";
import { assessPromptRelevance } from "@/lib/adapters/art-director";

describe("assessPromptRelevance", () => {
  it("passes a visual that clearly depicts the narration", () => {
    const narration = "The ancient Roman aqueducts carried fresh water across entire valleys.";
    const prompt = "A grand Roman aqueduct spanning a green valley, water flowing through stone channels";
    expect(assessPromptRelevance(prompt, narration).ok).toBe(true);
  });

  it("flags generic wallpaper unrelated to the narration", () => {
    const narration = "The ancient Roman aqueducts carried fresh water across entire valleys.";
    const prompt = "Abstract swirling purple gradient with soft glowing particles, cinematic";
    const r = assessPromptRelevance(prompt, narration);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/narration/);
  });

  it("skips (passes) when the narration is too short to judge", () => {
    expect(assessPromptRelevance("anything at all here", "Go.").ok).toBe(true);
  });

  it("fails an empty visual prompt against real narration", () => {
    const r = assessPromptRelevance("", "A detailed discussion of quantum entanglement experiments.");
    expect(r.ok).toBe(false);
    expect(r.overlap).toBe(0);
  });

  it("ignores boilerplate visual words (scene, shot, cinematic) when scoring", () => {
    // Only boilerplate + no content overlap → should fail.
    const narration = "Bees communicate the location of flowers through a waggle dance.";
    const prompt = "Wide cinematic establishing shot, dramatic lighting, camera angle";
    expect(assessPromptRelevance(prompt, narration).ok).toBe(false);
  });
});
