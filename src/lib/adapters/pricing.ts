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

/** Unknown-model fallback: the TOP tier in the table, so an unrecognised (or
    mistyped) model over-estimates rather than silently under-books ~40% at the
    old Sonnet fallback — the safe direction for a budget guardrail. Warned once. */
const FALLBACK_PRICE = { in: 5, out: 25 };
const warnedModels = new Set<string>();

export const anthropicPriceOf = (model: string): { in: number; out: number } => {
  const hit = ANTHROPIC_PRICING[model];
  if (hit) return hit;
  if (!warnedModels.has(model)) {
    warnedModels.add(model);
    console.warn(
      `[pricing] unknown Anthropic model "${model}" — billing at the top-tier fallback ` +
        `($${FALLBACK_PRICE.in}/$${FALLBACK_PRICE.out} per Mtok). Add it to ANTHROPIC_PRICING.`,
    );
  }
  return FALLBACK_PRICE;
};

/** Prompt-caching multipliers relative to the base input price: a cache WRITE
    (cache_creation_input_tokens) costs 1.25× input; a cache READ
    (cache_read_input_tokens) costs 0.1×. Base input_tokens already excludes
    cached tokens, so these are additive. */
const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT = 0.1;

/** Ledger cost for one call, rounded to 4 decimals. Cache tokens are optional
    (backward-compatible); pass them to price cache-heavy calls accurately. */
export function anthropicCostUsd(
  model: string,
  inTok: number,
  outTok: number,
  cache?: { creationTok?: number; readTok?: number },
): number {
  const p = anthropicPriceOf(model);
  const base = (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
  const cacheWrite = ((cache?.creationTok ?? 0) / 1e6) * p.in * CACHE_WRITE_MULT;
  const cacheRead = ((cache?.readTok ?? 0) / 1e6) * p.in * CACHE_READ_MULT;
  return Math.round((base + cacheWrite + cacheRead) * 10000) / 10000;
}
