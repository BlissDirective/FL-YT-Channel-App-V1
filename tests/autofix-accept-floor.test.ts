/**
 * Auto-fix accept floor (Library stall relaxation): when the loop runs out of
 * attempts, a cut whose best score is at/above the accept floor SETTLES instead
 * of latching as "held — manual review". Here we pin the floor derivation
 * (config) that drives that decision; the default = threshold − 1, min 5.
 */
import { describe, expect, it } from "vitest";
import { resolveAutofix } from "@/lib/pipeline/autofix";
import type { Project, Video } from "@/lib/db/types";

const project = (over: Record<string, unknown> = {}): Project =>
  ({
    id: "p1",
    visual_style: "footage",
    autofix_loop: "aiclip",
    autofix_enabled: true,
    autofix_config: { threshold: 7, maxRenders: 2, spendCapUsd: 1 },
    ...over,
  }) as unknown as Project;

const video = (over: Record<string, unknown> = {}): Video =>
  ({ id: "v1", autofix_enabled: null, ...over }) as unknown as Video;

describe("resolveAutofix accept floor", () => {
  it("defaults to threshold − 1, clamped to at least 5", () => {
    expect(resolveAutofix(project(), video()).config.acceptFloor).toBe(6); // 7 − 1
    expect(
      resolveAutofix(project({ autofix_config: { threshold: 5, maxRenders: 2, spendCapUsd: 1 } }), video()).config
        .acceptFloor,
    ).toBe(5); // max(5, 4)
    expect(
      resolveAutofix(project({ autofix_config: { threshold: 9, maxRenders: 2, spendCapUsd: 1 } }), video()).config
        .acceptFloor,
    ).toBe(8);
  });

  it("respects an explicit acceptFloor override", () => {
    const cfg = resolveAutofix(
      project({ autofix_config: { threshold: 7, maxRenders: 2, spendCapUsd: 1, acceptFloor: 6.5 } }),
      video(),
    ).config;
    expect(cfg.acceptFloor).toBe(6.5);
  });

  it("infers the loop from visual_style when the channel loop is off (force one-shot path)", () => {
    expect(resolveAutofix(project({ autofix_loop: "off", visual_style: "footage" }), video()).loop).toBe("aiclip");
    expect(resolveAutofix(project({ autofix_loop: "off", visual_style: "stick" }), video()).loop).toBe("animation");
  });
});
