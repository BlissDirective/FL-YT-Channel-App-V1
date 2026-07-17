/**
 * Provider fallback chains (#11 / B1) — the scored ranking becomes the fallback
 * order; a retry walks to the next model, and past the chain it flags exhausted
 * so the caller drops to the terminal still medium.
 */
import { describe, expect, it } from "vitest";
import { buildFallbackChain, fallbackForAttempt } from "@studio/core";

const sel = {
  model: "seedance-2",
  alternatives: [{ id: "kling-2-5-turbo" }, { id: "ltx-2" }],
};

describe("buildFallbackChain", () => {
  it("orders winner then alternatives, deduped", () => {
    expect(buildFallbackChain(sel)).toEqual(["seedance-2", "kling-2-5-turbo", "ltx-2"]);
  });
  it("dedupes a winner that also appears in alternatives", () => {
    expect(buildFallbackChain({ model: "seedance-2", alternatives: [{ id: "seedance-2" }, { id: "ltx-2" }] })).toEqual([
      "seedance-2",
      "ltx-2",
    ]);
  });
  it("returns [] for a missing/empty selection", () => {
    expect(buildFallbackChain(null)).toEqual([]);
    expect(buildFallbackChain({ model: "" })).toEqual([]);
  });
});

describe("fallbackForAttempt", () => {
  const chain = buildFallbackChain(sel);
  it("attempt 1 runs the primary", () => {
    expect(fallbackForAttempt(chain, 1)).toMatchObject({ model: "seedance-2", fallbackIndex: 0, exhausted: false });
  });
  it("attempt 2 walks to the first alternative", () => {
    expect(fallbackForAttempt(chain, 2)).toMatchObject({ model: "kling-2-5-turbo", fallbackIndex: 1 });
  });
  it("attempt 3 walks to the second alternative", () => {
    expect(fallbackForAttempt(chain, 3)).toMatchObject({ model: "ltx-2", fallbackIndex: 2 });
  });
  it("past the chain clamps to the last model and flags exhausted", () => {
    const step = fallbackForAttempt(chain, 5);
    expect(step?.model).toBe("ltx-2");
    expect(step?.exhausted).toBe(true);
    expect(step?.terminalMedium).toBe("still");
  });
  it("returns null for an empty chain", () => {
    expect(fallbackForAttempt([], 1)).toBeNull();
  });
});
