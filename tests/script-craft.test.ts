/**
 * Hook Laws knowledge base (operator's retention doc, 48 laws): the distilled
 * operative laws must ride into EVERY script generation. Pins the content of
 * the craft block, the prompt wiring, and the completed AI-tell ban list so a
 * later prompt refactor can't silently drop the knowledge base.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  AI_TELL_WORDS,
  AUTHENTICITY_LAWS,
  HOOK_LAWS,
  PACING_LAWS,
  RETENTION_LAWS,
  SCRIPT_CRAFT_LAWS,
  STRUCTURE_LAWS,
} from "@/lib/adapters/script-craft";

describe("script-craft knowledge base (Hook Laws)", () => {
  it("hook laws carry the eight operative rules", () => {
    expect(HOOK_LAWS).toContain("trust check");
    expect(HOOK_LAWS).toContain("viewer's situation".toUpperCase().slice(0, 0) + "VIEWER'S SITUATION");
    expect(HOOK_LAWS).toMatch(/never open with greetings/i);
    expect(HOOK_LAWS).toMatch(/two psychological mechanisms/i);
    expect(HOOK_LAWS).toMatch(/genuine contradiction/i);
    expect(HOOK_LAWS).toMatch(/specific number, date, or named detail/i);
    expect(HOOK_LAWS).toMatch(/same sentence/i);
    expect(HOOK_LAWS).toMatch(/promise/i);
  });

  it("retention laws carry gap cadence, point order, foreshadowing, incompletion", () => {
    expect(RETENTION_LAWS).toMatch(/30–45 seconds/);
    expect(RETENTION_LAWS).toMatch(/within 10 seconds/);
    expect(RETENTION_LAWS).toMatch(/second-best point FIRST, best point in the MIDDLE/);
    expect(RETENTION_LAWS).toMatch(/foreshadow/i);
    expect(RETENTION_LAWS).toMatch(/rhetorical question/i);
    expect(RETENTION_LAWS).toMatch(/INCOMPLETION/);
  });

  it("pacing laws carry the compression/expansion/shock cycle and the 90-second cap", () => {
    expect(PACING_LAWS).toMatch(/COMPRESSION/);
    expect(PACING_LAWS).toMatch(/EXPANSION/);
    expect(PACING_LAWS).toMatch(/SHOCK/);
    expect(PACING_LAWS).toMatch(/90 seconds/);
    expect(PACING_LAWS).toMatch(/Sentence-length variation/i);
  });

  it("authenticity laws carry editorial direction, specificity, opinion, and the close", () => {
    expect(AUTHENTICITY_LAWS).toMatch(/Editorial direction comes BEFORE/i);
    expect(AUTHENTICITY_LAWS).toMatch(/generic prompt/i);
    expect(AUTHENTICITY_LAWS).toMatch(/GENUINE opinion/);
    expect(AUTHENTICITY_LAWS).toMatch(/FINAL INSIGHT/);
    expect(AUTHENTICITY_LAWS).toMatch(/curiosity gap toward the NEXT video/i);
  });

  it("the combined block includes every section and stays prompt-sized", () => {
    for (const part of [HOOK_LAWS, RETENTION_LAWS, PACING_LAWS, AUTHENTICITY_LAWS, STRUCTURE_LAWS]) {
      expect(SCRIPT_CRAFT_LAWS).toContain(part);
    }
    // Bounded: knowledge, not a book — keeps per-script prompt cost sane.
    expect(SCRIPT_CRAFT_LAWS.length).toBeLessThan(7000);
  });

  it("is wired into the live script prompt (source pin)", () => {
    const src = readFileSync("src/lib/adapters/script.ts", "utf8");
    expect(src).toContain('import { SCRIPT_CRAFT_LAWS } from "./script-craft"');
    expect(src).toMatch(/\$\{prompt\}\$\{hardRules\}\$\{SCRIPT_CRAFT_LAWS\}\$\{lessons\}/);
  });

  it("law 26: the full AI-tell vocabulary cluster is banned in the writer's system prompt", () => {
    const src = readFileSync("src/lib/adapters/script.ts", "utf8");
    const banLine = src.split("\n").find((l) => l.includes("BANNED phrases"))!;
    for (const word of AI_TELL_WORDS) {
      expect(banLine.toLowerCase()).toContain(word);
    }
  });
});
