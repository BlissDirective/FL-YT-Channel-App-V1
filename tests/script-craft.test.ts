/**
 * Lesson-craft knowledge base: the instructional-design laws must ride into
 * EVERY lesson-script generation. Pins the content of the craft block, the
 * prompt wiring, and the completed AI-tell ban list so a later prompt refactor
 * can't silently drop the knowledge base.
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

describe("script-craft knowledge base (lesson craft laws)", () => {
  it("objective-hook laws carry the operative rules", () => {
    expect(HOOK_LAWS).toContain("motivation check");
    expect(HOOK_LAWS).toContain("LEARNER'S SITUATION");
    expect(HOOK_LAWS).toMatch(/never open with greetings/i);
    expect(HOOK_LAWS).toMatch(/dictionary definition/i);
    expect(HOOK_LAWS).toMatch(/what they can DO differently/);
    expect(HOOK_LAWS).toMatch(/real cost or stake/i);
    expect(HOOK_LAWS).toMatch(/promise/i);
    expect(HOOK_LAWS).toMatch(/you can now do this/i);
  });

  it("cognitive-load laws carry one-idea beats, sequencing, definitions, signposting", () => {
    expect(RETENTION_LAWS).toMatch(/ONE idea per beat/);
    expect(RETENTION_LAWS).toMatch(/Prerequisite before dependent/i);
    expect(RETENTION_LAWS).toMatch(/prior knowledge/i);
    expect(RETENTION_LAWS).toMatch(/FIRST time it appears/);
    expect(RETENTION_LAWS).toMatch(/Signpost/i);
    expect(RETENTION_LAWS).toMatch(/within 10 seconds/);
    expect(RETENTION_LAWS).toMatch(/HANDLE/);
  });

  it("pacing laws carry the explain/show/check cycle and the 60-second cap", () => {
    expect(PACING_LAWS).toMatch(/EXPLAIN/);
    expect(PACING_LAWS).toMatch(/SHOW/);
    expect(PACING_LAWS).toMatch(/CHECK/);
    expect(PACING_LAWS).toMatch(/60 seconds/);
    expect(PACING_LAWS).toMatch(/Sentence-length variation/i);
  });

  it("teaching-authenticity laws carry accuracy, visible thinking, opinion, and the close", () => {
    expect(AUTHENTICITY_LAWS).toMatch(/ACCURACY IS NON-NEGOTIABLE/);
    expect(AUTHENTICITY_LAWS).toMatch(/invisible thinking visible/i);
    expect(AUTHENTICITY_LAWS).toMatch(/generic prompt/i);
    expect(AUTHENTICITY_LAWS).toMatch(/GENUINE point of view/);
    expect(AUTHENTICITY_LAWS).toMatch(/RECAP/);
    expect(AUTHENTICITY_LAWS).toMatch(/BRIDGE/);
  });

  it("structure laws carry the worked example and the quiz-card seed", () => {
    expect(STRUCTURE_LAWS).toMatch(/worked example/i);
    expect(STRUCTURE_LAWS).toMatch(/check-for-understanding/i);
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

  it("the full AI-tell vocabulary cluster is banned in the writer's system prompt", () => {
    const src = readFileSync("src/lib/adapters/script.ts", "utf8");
    const banLine = src.split("\n").find((l) => l.includes("BANNED phrases"))!;
    for (const word of AI_TELL_WORDS) {
      expect(banLine.toLowerCase()).toContain(word);
    }
  });
});
