/** pricing.ts — the single Anthropic price table (Phase 2 consolidation). */
import { describe, expect, it } from "vitest";
import { ANTHROPIC_PRICING, anthropicCostUsd, anthropicPriceOf } from "@/lib/adapters/pricing";

describe("anthropicPriceOf", () => {
  it("returns the table entry for known models", () => {
    expect(anthropicPriceOf("claude-haiku-4-5")).toEqual({ in: 1, out: 5 });
    expect(anthropicPriceOf("claude-opus-4-8")).toEqual({ in: 5, out: 25 });
  });

  it("falls back to sonnet pricing for unknown models", () => {
    expect(anthropicPriceOf("claude-nonexistent")).toEqual(ANTHROPIC_PRICING["claude-sonnet-4-6"]);
  });
});

describe("anthropicCostUsd", () => {
  it("computes per-million-token math", () => {
    // 1M in + 1M out on sonnet = $3 + $15.
    expect(anthropicCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBe(18);
  });

  it("rounds to 4 decimals", () => {
    // 1234 in / 567 out on haiku: 0.001234 + 0.002835 = 0.004069.
    expect(anthropicCostUsd("claude-haiku-4-5", 1234, 567)).toBe(0.0041);
  });

  it("is zero for zero usage", () => {
    expect(anthropicCostUsd("claude-sonnet-4-6", 0, 0)).toBe(0);
  });
});
