/** pricing.ts — the single Anthropic price table (Phase 2 consolidation). */
import { describe, expect, it } from "vitest";
import { ANTHROPIC_PRICING, anthropicCostUsd, anthropicPriceOf } from "@/lib/adapters/pricing";

describe("anthropicPriceOf", () => {
  it("returns the table entry for known models", () => {
    expect(anthropicPriceOf("claude-haiku-4-5")).toEqual({ in: 1, out: 5 });
    expect(anthropicPriceOf("claude-opus-4-8")).toEqual({ in: 5, out: 25 });
  });

  it("falls back to the TOP tier for unknown models (over-estimate, not under)", () => {
    // Was Sonnet (under-books an Opus-tier call ~40%); now the top tier so an
    // unrecognised id is budget-safe.
    expect(anthropicPriceOf("claude-nonexistent")).toEqual(ANTHROPIC_PRICING["claude-opus-4-8"]);
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

  it("prices cache tokens: write at 1.25x input, read at 0.1x input", () => {
    // sonnet input $3/Mtok. 1M cache-creation → 3*1.25 = 3.75; 1M cache-read → 3*0.1 = 0.30.
    expect(anthropicCostUsd("claude-sonnet-4-6", 0, 0, { creationTok: 1_000_000 })).toBe(3.75);
    expect(anthropicCostUsd("claude-sonnet-4-6", 0, 0, { readTok: 1_000_000 })).toBe(0.3);
    // additive with base in/out
    expect(anthropicCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000, { readTok: 1_000_000 })).toBe(18.3);
  });

  it("cache tokens are optional (backward compatible)", () => {
    expect(anthropicCostUsd("claude-haiku-4-5", 1234, 567)).toBe(0.0041);
  });
});
