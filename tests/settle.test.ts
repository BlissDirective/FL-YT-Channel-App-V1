/**
 * v2 — the shared FINAL_REVIEW settle core (src/lib/pipeline/settle.ts).
 * Both the build-run finalizer and the operator approval pass consult these
 * rules; pinning them here means the two owners can't drift apart again
 * (the §0.4 autofix-enablement drift class).
 */
import { describe, expect, it, vi } from "vitest";

const watchGateRuns = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/lib/pipeline/watch-runner", () => ({
  runWatchGate: async () => {
    watchGateRuns.count += 1;
    return { fresh: true } as never;
  },
}));

import {
  autofixSettled,
  resolveWatchVerdict,
  watchBlocksPublish,
  watchHoldReason,
} from "@/lib/pipeline/settle";

const verdict = (overall: number, opts: Partial<{ degraded: boolean; policyRisk: boolean; fixPlan: { reason: string }[] }> = {}) =>
  ({
    overall,
    degraded: opts.degraded ?? false,
    policyRisk: opts.policyRisk ?? false,
    fixPlan: opts.fixPlan ?? [],
  }) as never;

describe("rule 1 — autofixSettled", () => {
  const cases: [string, boolean | null, boolean | null, string | undefined, boolean][] = [
    // projectEnabled, videoOverride, loopStatus → settled?
    ["loop off at project level", false, null, "critique", true],
    ["loop on, mid-critique", true, null, "critique", false],
    ["loop on, rendering", true, null, "rendering", false],
    ["loop on, converged done", true, null, "done", true],
    ["loop on, held", true, null, "held", true],
    ["loop on, no state yet", true, null, undefined, false],
    ["video opts out of project loop", true, false, "critique", true],
    ["video opts in over project off", false, true, "critique", false],
    // Tier 9.1 semantics: default is ON when nothing is set.
    ["defaults (both null) → loop on", null, null, undefined, false],
  ];
  for (const [name, proj, vid, status, settled] of cases) {
    it(name, () => {
      expect(
        autofixSettled(
          { autofix_enabled: proj } as never,
          { autofix_enabled: vid, autofix_state: status ? { status } : null } as never,
        ),
      ).toBe(settled);
    });
  }
});

describe("rule 2 — resolveWatchVerdict reuse", () => {
  it("reuses a stored verdict whose competitive dimension was judged", async () => {
    watchGateRuns.count = 0;
    const stored = { competitive: { evaluated: true }, overall: 7 };
    const out = await resolveWatchVerdict(
      {} as never,
      { watch_review: stored } as never,
      {} as never,
    );
    expect(out).toBe(stored);
    expect(watchGateRuns.count).toBe(0); // no paid re-run on a settled verdict
  });

  it("runs the gate when competitive hasn't been judged (or after re-render reset)", async () => {
    watchGateRuns.count = 0;
    const out = await resolveWatchVerdict(
      {} as never,
      { watch_review: { competitive: { evaluated: false } } } as never,
      {} as never,
    );
    expect(out).toEqual({ fresh: true });
    expect(watchGateRuns.count).toBe(1);
  });
});

describe("rule 3 — watchBlocksPublish", () => {
  const qg = { watchBlockPublishBelow: 5 };

  it("blocks under the floor", () => {
    expect(watchBlocksPublish(verdict(4.9), qg)).toEqual({ blocked: true, policyRisk: false });
  });

  it("blocks on policy risk even with a high score (compliance floor)", () => {
    expect(watchBlocksPublish(verdict(9.5, { policyRisk: true }), qg)).toEqual({
      blocked: true,
      policyRisk: true,
    });
  });

  it("passes at/above the floor without risk", () => {
    expect(watchBlocksPublish(verdict(5.0), qg).blocked).toBe(false);
  });

  it("a degraded verdict never blocks here (hold is owned elsewhere, never faked)", () => {
    expect(watchBlocksPublish(verdict(0, { degraded: true }), qg).blocked).toBe(false);
  });

  it("no verdict → no block", () => {
    expect(watchBlocksPublish(null, qg)).toEqual({ blocked: false, policyRisk: false });
  });
});

describe("watchHoldReason", () => {
  const qg = { watchBlockPublishBelow: 5 };

  it("policy risk always names the compliance hold", () => {
    expect(watchHoldReason(verdict(9, { policyRisk: true }), qg)).toMatch(
      /content-policy risk .*human review required/,
    );
  });

  it("low score names the floor and the top fixes", () => {
    const r = watchHoldReason(
      verdict(3.2, { fixPlan: [{ reason: "beat 2 off-topic" }, { reason: "dead air" }, { reason: "x" }] }),
      qg,
    );
    expect(r).toContain("3.2/10 below the 5.0 floor");
    expect(r).toContain("beat 2 off-topic; dead air");
    expect(r).not.toContain("; x");
  });
});
