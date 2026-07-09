/**
 * Anthropic model pricing (USD per million tokens) for the cost ledger —
 * single source of truth (was duplicated across script.ts / guardrails.ts /
 * scout.ts). Update here when models or prices change.
 */
export const ANTHROPIC_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

export const anthropicPriceOf = (model: string): { in: number; out: number } =>
  ANTHROPIC_PRICING[model] ?? { in: 3, out: 15 };

/** Ledger cost for one call, rounded to 4 decimals. */
export function anthropicCostUsd(model: string, inTok: number, outTok: number): number {
  const p = anthropicPriceOf(model);
  return Math.round(((inTok / 1e6) * p.in + (outTok / 1e6) * p.out) * 10000) / 10000;
}
