/**
 * Ad-craft knowledge base: the direct-response marketing laws must ride into
 * EVERY script generation. Pins the content of the craft block, the prompt
 * wiring, and the completed AI-tell ban list so a later prompt refactor can't
 * silently drop the knowledge base.
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

describe("script-craft knowledge base (ad craft laws)", () => {
  it("hook laws carry the operative scroll-stopping rules", () => {
    expect(HOOK_LAWS).toContain("scroll check");
    expect(HOOK_LAWS).toContain("BUYER'S PAIN");
    expect(HOOK_LAWS).toMatch(/never open with the product name/i);
    expect(HOOK_LAWS).toMatch(/pattern interrupt/i);
    expect(HOOK_LAWS).toMatch(/specific number, scenario, or named detail/i);
    expect(HOOK_LAWS).toMatch(/same line/i);
    expect(HOOK_LAWS).toMatch(/promise/i);
    expect(HOOK_LAWS).toMatch(/variants actually test something/i);
  });

  it("persuasion laws carry the spine, concrete stakes, mechanism, proof, objection", () => {
    expect(RETENTION_LAWS).toMatch(/PAIN → STAKES → MECHANISM → PROOF → CTA/);
    expect(RETENTION_LAWS).toMatch(/within 10 seconds/);
    expect(RETENTION_LAWS).toMatch(/MECHANISM before features/);
    expect(RETENTION_LAWS).toMatch(/One PROOF point/);
    expect(RETENTION_LAWS).toMatch(/objection/i);
    expect(RETENTION_LAWS).toMatch(/rhetorical question/i);
  });

  it("pacing laws carry the punch/show/talk cycle and feed-native caps", () => {
    expect(PACING_LAWS).toMatch(/PUNCH/);
    expect(PACING_LAWS).toMatch(/SHOW/);
    expect(PACING_LAWS).toMatch(/TALK/);
    expect(PACING_LAWS).toMatch(/20 seconds/);
    expect(PACING_LAWS).toMatch(/Sentence-length variation/i);
  });

  it("authenticity laws carry UGC voice, claim compliance, and the single-CTA close", () => {
    expect(AUTHENTICITY_LAWS).toMatch(/UGC means a PERSON/);
    expect(AUTHENTICITY_LAWS).toMatch(/CLAIM COMPLIANCE IS NON-NEGOTIABLE/);
    expect(AUTHENTICITY_LAWS).toMatch(/no ad-speak/i);
    expect(AUTHENTICITY_LAWS).toMatch(/GENUINE opinion/);
    expect(AUTHENTICITY_LAWS).toMatch(/ONE clear call-to-action/i);
    expect(AUTHENTICITY_LAWS).toMatch(/One CTA only/i);
  });

  it("structure laws carry the remove test, say-while-showing, and true variants", () => {
    expect(STRUCTURE_LAWS).toMatch(/nothing left to REMOVE/i);
    expect(STRUCTURE_LAWS).toMatch(/visible on-screen counterpart/i);
    expect(STRUCTURE_LAWS).toMatch(/VARIANTS/);
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
